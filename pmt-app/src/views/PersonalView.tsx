import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkItem } from '../types';
import { RichEditor } from '../components/RichEditor';
import { PersonalTodoList } from '../components/PersonalTodoList';
import { AutoSaveIndicator, useAutoSave } from '../components/AutoSaveIndicator';
import { useToast } from '../components/Toast';
import { generateWorkItemId } from '../lib/id-generator';
import { serializeMarkdownItem } from '../lib/markdown';
import { ITEMS_FOLDER } from '../lib/constants';
import { saveNote, deleteNoteFile } from '../lib/personal-store';
import {
  FileText, PlusCircle, CheckSquare, ChevronDown, ChevronRight,
  Coffee, Circle, CheckCircle2, BookOpen, Trash2, ExternalLink, AlertCircle
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  'In Progress': { color: 'text-blue-700', bg: 'bg-blue-50', icon: <Circle size={14} className="text-blue-500 fill-blue-200" /> },
  'To Do':       { color: 'text-gray-700', bg: 'bg-gray-50',  icon: <Circle size={14} className="text-gray-400" /> },
  'In Review':   { color: 'text-amber-700', bg: 'bg-amber-50', icon: <Circle size={14} className="text-amber-500 fill-amber-200" /> },
  'Done':        { color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle2 size={14} className="text-green-500" /> },
};
const STATUS_ORDER = ['In Progress', 'To Do', 'In Review', 'Done'];

type TabType = 'notes' | 'todos' | 'tasks';

export function PersonalView() {
  const navigate = useNavigate();
  const { 
    itemsTree, items, currentUser, workspacePath, config, 
    addItem, updateItem, personalNotes, addPersonalNote, updatePersonalNote, deletePersonalNote,
    setPersonalNotes,
  } = useWorkspace();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem('personalSpaceTab') as TabType) || 'notes';
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['Done']));
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const isInitialNoteLoad = useRef(true);

  // Migration banner state
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [migrationNotesCount, setMigrationNotesCount] = useState(0);

  const activeNote = useMemo(() => personalNotes.find(n => n.id === selectedNoteId), [personalNotes, selectedNoteId]);

  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    const find = (tree: WorkItem[]): WorkItem[] => {
      let r: WorkItem[] = [];
      for (const item of tree) {
        if (item.assignee === currentUser) r.push(item);
        if (item.children?.length) r = [...r, ...find(item.children)];
      }
      return r;
    };
    return find(itemsTree);
  }, [itemsTree, currentUser]);

  const tasksByStatus = useMemo(() => {
    const g: Record<string, WorkItem[]> = {};
    for (const s of STATUS_ORDER) g[s] = [];
    for (const t of myTasks) { const s = t.status || 'To Do'; if (!g[s]) g[s] = []; g[s].push(t); }
    for (const k of Object.keys(g)) g[k].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return g;
  }, [myTasks]);

  const getNextStatus = (item: WorkItem) => {
    const i = config.statuses.indexOf(item.status);
    return config.statuses[(i + 1) % config.statuses.length];
  };

  const handleCycleStatus = async (item: WorkItem) => {
    if (!workspacePath) return;
    const newStatus = getNextStatus(item);
    const updated = { ...item, status: newStatus, updatedAt: new Date().toISOString() };
    const md = serializeMarkdownItem(updated);
    await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${updated.fileName}`, md);
    updateItem(updated);
    showToast(`"${item.title}" → ${newStatus}`, 'success');
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('personalSpaceTab', activeTab);
  }, [activeTab]);

  // Check migration on mount
  useEffect(() => {
    if (!currentUser || !workspacePath) return;
    const checkMigration = async () => {
      const { isMigrationNeeded } = await import('../lib/personal-store');
      if (!isMigrationNeeded(currentUser)) return;

      // Check if old path has notes
      const oldPath = `${workspacePath}/.syncboard/users/${currentUser}/notes`;
      try {
        const files = await window.electronAPI.readDir(oldPath);
        const mdFiles = files.filter((f: string) => f.endsWith('.md'));
        if (mdFiles.length > 0) {
          setMigrationNotesCount(mdFiles.length);
          setShowMigrationBanner(true);
        }
      } catch (e) {
        // Old path doesn't exist, no migration needed
      }
    };
    checkMigration();
  }, [currentUser, workspacePath]);

  const handleMigration = async (action: 'move' | 'keep-both' | 'skip') => {
    if (!currentUser || !workspacePath) return;
    
    try {
      const { markMigrationDone, loadNotes } = await import('../lib/personal-store');
      const oldPath = `${workspacePath}/.syncboard/users/${currentUser}/notes`;
      const files = await window.electronAPI.readDir(oldPath);
      const mdFiles = files.filter((f: string) => f.endsWith('.md'));

      if (action === 'skip') {
        markMigrationDone(currentUser);
        setShowMigrationBanner(false);
        return;
      }

      // Copy files to new home path
      for (const file of mdFiles) {
        const content = await window.electronAPI.readFile(`${oldPath}/${file}`);
        if (content) {
          await window.electronAPI.writeHomePath(`users/${currentUser}/notes/${file}`, content);
        }
      }

      // Delete originals if "move"
      if (action === 'move') {
        for (const file of mdFiles) {
          await window.electronAPI.deleteFile(`${oldPath}/${file}`);
        }
      }

      markMigrationDone(currentUser);
      setShowMigrationBanner(false);
      
      // Reload notes from new location
      const newNotes = await loadNotes(currentUser);
      setPersonalNotes(newNotes);
      
      showToast(`Migrated ${mdFiles.length} notes to global Personal Space`, 'success');
    } catch (e) {
      console.error('Migration error:', e);
      showToast('Migration failed', 'error');
    }
  };

  // ─── Notes ────────────────────────────────────────────────────
  const handleCreateNote = async () => {
    if (!currentUser) return;
    const id = generateWorkItemId(personalNotes);
    const newNote: WorkItem = {
      id, title: 'Untitled Note', type: 'Note', status: 'Draft', assignee: currentUser,
      content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      fileName: `${id}.md`, comments: [], attachments: [],
    };
    await saveNote(currentUser, newNote);
    addPersonalNote(newNote);
    setSelectedNoteId(id);
    showToast('New note created', 'success');
  };

  const handleDeleteNote = async (id: string) => {
    if (!currentUser) return;
    const note = personalNotes.find(n => n.id === id);
    if (!note) return;
    if (confirm('Delete this note?')) {
      await deleteNoteFile(currentUser, note.fileName);
      await deletePersonalNote(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
      showToast('Note deleted', 'success');
    }
  };

  const handlePromoteToBoard = async () => {
    if (!activeNote || !workspacePath || !currentUser) return;
    const id = generateWorkItemId(items);
    const newItem: WorkItem = {
      id, title: activeNote.title, type: 'Task', status: config.statuses[0] || 'To Do',
      assignee: currentUser, content: activeNote.content,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      fileName: `${id}.md`, comments: [],
      attachments: [`~/.syncboard/users/${currentUser}/notes/${activeNote.fileName}`],
    };
    const md = serializeMarkdownItem(newItem);
    await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${newItem.fileName}`, md);
    addItem(newItem);
    showToast(`Promoted "${activeNote.title}" to board as ${id}`, 'success');
  };

  useEffect(() => {
    if (activeNote) {
      isInitialNoteLoad.current = true;
      setNoteContent(activeNote.content);
      setNoteTitle(activeNote.title);
      setTimeout(() => { isInitialNoteLoad.current = false; }, 100);
    } else { setNoteContent(''); setNoteTitle(''); }
  }, [activeNote?.id]);

  const saveNoteContent = useCallback(async (content: string, title: string = noteTitle) => {
    if (!activeNote || !currentUser || isInitialNoteLoad.current) return;
    const u = { ...activeNote, content, title, updatedAt: new Date().toISOString() };
    await saveNote(currentUser, u);
    updatePersonalNote(u);
  }, [activeNote, currentUser, updatePersonalNote, noteTitle]);

  const handleUndoNote = useCallback((previousContent: string) => {
    setNoteContent(previousContent);
    showToast('Note restored to previous version', 'success');
  }, [showToast]);

  const { status: asStatus, lastSavedAt, error: asError, canUndo: noteCanUndo, handleUndo: handleNoteUndo } = useAutoSave(
    noteContent,
    (c) => saveNoteContent(c, noteTitle),
    1000,
    handleUndoNote,
  );

  const handleTitleBlur = () => { if (activeNote && noteTitle !== activeNote.title) saveNoteContent(noteContent, noteTitle); };

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm max-w-sm">
          <div className="text-5xl mb-4">👤</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">No User Selected</h2>
          <p className="text-gray-500 mb-6 text-sm">Select a user in Settings to access My Space.</p>
          <button onClick={() => navigate('/settings')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Go to Settings</button>
        </div>
      </div>
    );
  }

  const sortedNotes = [...personalNotes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Space</h1>
            <p className="text-sm text-gray-500">{currentUser}</p>
          </div>
          {activeTab === 'notes' && (
            <button onClick={handleCreateNote} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">
              <PlusCircle size={16} /> New Note
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 -mb-px">
          {[
            { key: 'notes' as TabType, label: 'Notes', icon: <FileText size={14} /> },
            { key: 'todos' as TabType, label: 'Todos', icon: <CheckSquare size={14} /> },
            { key: 'tasks' as TabType, label: 'My Tasks', icon: <Coffee size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Migration Banner */}
      {showMigrationBanner && (
        <div className="bg-amber-50 border-y border-amber-200 px-6 py-3 flex items-start gap-3 flex-shrink-0">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-900 font-medium">
              {migrationNotesCount} note{migrationNotesCount !== 1 ? 's' : ''} found in your old workspace location.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Move them to your global Personal Space?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleMigration('move')}
              className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              Move
            </button>
            <button
              onClick={() => handleMigration('keep-both')}
              className="px-3 py-1 text-xs font-medium bg-white text-amber-900 border border-amber-300 rounded hover:bg-amber-100"
            >
              Keep Both
            </button>
            <button
              onClick={() => handleMigration('skip')}
              className="px-3 py-1 text-xs font-medium text-amber-700 hover:text-amber-900"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'notes' && (
          <div className="h-full flex">
            {/* Left Panel: Note List */}
            <div className="w-1/3 border-r bg-white flex flex-col overflow-hidden min-w-[280px]">
              <div className="flex-1 overflow-auto p-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center justify-between">
                  <span>My Notes</span>
                  <span className="text-xs font-normal">{personalNotes.length}</span>
                </h2>
                {sortedNotes.length > 0 ? (
                  <div className="space-y-1">
                    {sortedNotes.map(note => (
                      <div key={note.id} onClick={() => setSelectedNoteId(note.id)}
                        className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors border ${selectedNoteId === note.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-gray-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${selectedNoteId === note.id ? 'text-blue-900' : 'text-gray-900'}`}>{note.title}</p>
                            <span className="text-xs text-gray-400">{new Date(note.updatedAt).toLocaleDateString()}</span>
                          </div>
                          {selectedNoteId === note.id && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="text-gray-400 hover:text-red-500 p-1" title="Delete note">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400 px-2 italic">No notes yet. Click "+ New Note" to start.</p>}
              </div>
            </div>

            {/* Right Panel: Editor */}
            <div className="w-2/3 flex flex-col bg-white overflow-hidden relative">
              {activeNote ? (
                <>
                  <div className="px-8 py-4 border-b bg-white flex flex-col gap-2 flex-shrink-0 z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Created {new Date(activeNote.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={handlePromoteToBoard} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors" title="Copy this note to the workspace board as a new task">
                          <ExternalLink size={13} /> Promote to Board
                        </button>
                        <AutoSaveIndicator status={asStatus} lastSavedAt={lastSavedAt} error={asError} canUndo={noteCanUndo} onUndo={handleNoteUndo} />
                      </div>
                    </div>
                    <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} onBlur={handleTitleBlur}
                      className="text-2xl font-bold text-gray-900 border-none outline-none focus:ring-0 p-0 bg-transparent placeholder-gray-300 w-full" placeholder="Note Title" />
                  </div>
                  
                  <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
                    <RichEditor content={noteContent} onChange={setNoteContent}
                      onMention={q => config.users?.filter(u => u.toLowerCase().includes(q.toLowerCase())) || []}
                      placeholder="Start writing..." workspacePath={workspacePath || undefined} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <BookOpen size={48} className="text-gray-200 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Note Selected</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm">Select a note from the sidebar or create a new one.</p>
                  <button onClick={handleCreateNote} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">+ New Note</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'todos' && (
          <div className="h-full overflow-auto">
            <PersonalTodoList />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">My Workspace Tasks</h2>
              {myTasks.length > 0 ? (
                <div className="space-y-3">
                  {STATUS_ORDER.map(status => {
                    const tasks = tasksByStatus[status] || [];
                    if (!tasks.length) return null;
                    const collapsed = collapsedGroups.has(status);
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['To Do'];
                    return (
                      <div key={status} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                        <button onClick={() => toggleGroup(status)} className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold ${cfg.color} ${cfg.bg}`}>
                          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          {status} <span className="font-normal text-xs opacity-60 ml-auto">{tasks.length}</span>
                        </button>
                        {!collapsed && <div className="divide-y bg-white">
                          {tasks.map(task => (
                            <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" title="Click to open on board" onClick={() => navigate(`/workspace/item/${task.id}`)}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCycleStatus(task); }}
                                className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                                title={`Click to change: ${task.status} → ${getNextStatus(task)}`}
                              >
                                {cfg.icon}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{task.id}</p>
                              </div>
                            </div>
                          ))}
                        </div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Coffee size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No tasks assigned to you.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
