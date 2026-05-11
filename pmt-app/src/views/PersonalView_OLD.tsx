import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkItem } from '../types';
import { RichEditor } from '../components/RichEditor';
import { AutoSaveIndicator, useAutoSave } from '../components/AutoSaveIndicator';
import { useToast } from '../components/Toast';
import { generateWorkItemId } from '../lib/id-generator';
import { serializeMarkdownItem } from '../lib/markdown';
import { ITEMS_FOLDER } from '../lib/constants';
import {
  FileText, PlusCircle, CheckSquare, ChevronDown, ChevronRight,
  Coffee, Circle, CheckCircle2, Sparkles, X, BookOpen, Trash2, ExternalLink
} from 'lucide-react';
import { callLLM, LLMMessage } from '../lib/llm-providers';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  'In Progress': { color: 'text-blue-700', bg: 'bg-blue-50', icon: <Circle size={14} className="text-blue-500 fill-blue-200" /> },
  'To Do':       { color: 'text-gray-700', bg: 'bg-gray-50',  icon: <Circle size={14} className="text-gray-400" /> },
  'In Review':   { color: 'text-amber-700', bg: 'bg-amber-50', icon: <Circle size={14} className="text-amber-500 fill-amber-200" /> },
  'Done':        { color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle2 size={14} className="text-green-500" /> },
};
const STATUS_ORDER = ['In Progress', 'To Do', 'In Review', 'Done'];

interface AIAction {
  type: 'summarize_note' | 'create_note' | 'create_task' | 'update_task' | 'add_comment';
  title?: string; content?: string; assignee?: string; taskId?: string; newStatus?: string; comment?: string; selected?: boolean;
}

export function PersonalView() {
  const navigate = useNavigate();
  const { 
    itemsTree, items, currentUser, workspacePath, config, 
    addItem, updateItem, personalNotes, addPersonalNote, updatePersonalNote, deletePersonalNote,
    llmProvider, llmApiKeys, llmModel
  } = useWorkspace();
  const { showToast } = useToast();
  
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['Done']));
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const isInitialNoteLoad = useRef(true);
  const [showAIBar, setShowAIBar] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processInstruction, setProcessInstruction] = useState('');
  const [proposedActions, setProposedActions] = useState<AIAction[] | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);

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

  // ─── Notes ────────────────────────────────────────────────────
  const handleCreateNote = async () => {
    if (!workspacePath || !currentUser) return;
    const id = generateWorkItemId(personalNotes);
    const newNote: WorkItem = {
      id, title: 'Untitled Note', type: 'Note', status: 'Draft', assignee: currentUser,
      content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      fileName: `${id}.md`, comments: [], attachments: [],
    };
    const md = serializeMarkdownItem(newNote);
    const dir = `${workspacePath}/.syncboard/users/${currentUser}/notes`;
    await window.electronAPI.ensureDir(dir);
    await window.electronAPI.writeFile(`${dir}/${newNote.fileName}`, md);
    addPersonalNote(newNote);
    setSelectedNoteId(id);
    showToast('New note created', 'success');
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Delete this note?')) {
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
      attachments: [`users/${currentUser}/notes/${activeNote.fileName}`],
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
      // Collapse AI bar on note switch but DON'T clear the instruction text
      // so the PM can run the same instruction across multiple notes easily
      setShowAIBar(false);
      setTimeout(() => { isInitialNoteLoad.current = false; }, 100);
    } else { setNoteContent(''); setNoteTitle(''); }
  }, [activeNote?.id]);

  const saveNote = useCallback(async (content: string, title: string = noteTitle) => {
    if (!activeNote || !workspacePath || !currentUser || isInitialNoteLoad.current || isProcessing) return;
    const u = { ...activeNote, content, title, updatedAt: new Date().toISOString() };
    await window.electronAPI.writeFile(`${workspacePath}/.syncboard/users/${currentUser}/notes/${u.fileName}`, serializeMarkdownItem(u));
    updatePersonalNote(u);
  }, [activeNote, workspacePath, currentUser, updatePersonalNote, noteTitle, isProcessing]);

  // Undo: restore the note content to what it was before the last autosave
  const handleUndoNote = useCallback((previousContent: string) => {
    setNoteContent(previousContent);
    showToast('Note restored to previous version', 'success');
  }, [showToast]);

  // Pass null to useAutoSave while AI is processing to pause it completely
  const { status: asStatus, lastSavedAt, error: asError, canUndo: noteCanUndo, handleUndo: handleNoteUndo } = useAutoSave(
    isProcessing ? null : noteContent,
    (c) => saveNote(c, noteTitle),
    1000,
    handleUndoNote,
  );

  const handleTitleBlur = () => { if (activeNote && noteTitle !== activeNote.title) saveNote(noteContent, noteTitle); };

  // ─── AI Processing ────────────────────────────────────────────
  const handleProcessNote = async () => {
    const apiKey = llmApiKeys?.[llmProvider];
    if (!apiKey) return showToast('No LLM API key configured.', 'error');
    if (!activeNote) return;
    setIsProcessing(true);
    try {
      const sys = `You are a PM assistant. Analyze notes and extract actions. Output ONLY a valid JSON array. No markdown blocks.
Actions: "summarize_note" (content to APPEND), "create_note" (title+content), "create_task" (title+assignee+content), "update_task" (taskId+newStatus), "add_comment" (taskId+comment). Return [] if nothing.`;
      const usr = `NOTE: ${noteTitle}\n${noteContent}\n\nINSTRUCTION: ${processInstruction || 'Extract tasks and summarize.'}\n\nJSON:`;
      const resp = await callLLM({ provider: llmProvider, apiKey, model: llmModel || undefined }, [{ role: 'user', content: usr }], sys);
      
      // Robust JSON extraction for models that might add markdown blocks or conversational text
      const content = resp.content;
      const match = content.match(/\[[\s\S]*\]/);
      let t = match ? match[0] : content.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(t) as AIAction[];
      setProposedActions(parsed.map(a => ({ ...a, selected: true })));
      setShowProcessModal(true);
    } catch (e) { console.error(e); showToast('Failed to process note', 'error'); }
    finally { setIsProcessing(false); }
  };

  const executeAIActions = async () => {
    if (!proposedActions || !activeNote || !workspacePath || !currentUser) return;
    const sel = proposedActions.filter(a => a.selected);
    let summary = ''; let tc = 0;
    for (const a of sel) {
      if (a.type === 'summarize_note' && a.content) { summary += `\n\n---\n## AI Summary\n${a.content}`; }
      else if (a.type === 'create_note' && a.title) {
        const id = generateWorkItemId(personalNotes);
        const n: WorkItem = { id, title: a.title, type: 'Note', status: 'Draft', assignee: currentUser, content: a.content || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), fileName: `${id}.md`, comments: [], attachments: [] };
        await window.electronAPI.writeFile(`${workspacePath}/.syncboard/users/${currentUser}/notes/${n.fileName}`, serializeMarkdownItem(n));
        addPersonalNote(n);
      }
      else if (a.type === 'create_task' && a.title) {
        const id = generateWorkItemId(items);
        const t: WorkItem = { id, title: a.title, type: 'Task', status: config.statuses[0] || 'To Do', assignee: a.assignee || '', content: a.content || `From: ${activeNote.title}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), fileName: `${id}.md`, comments: [], attachments: [`users/${currentUser}/notes/${activeNote.fileName}`] };
        await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${t.fileName}`, serializeMarkdownItem(t));
        addItem(t); tc++;
      }
      else if (a.type === 'update_task' && a.taskId && a.newStatus) {
        const task = items.find(i => i.id === a.taskId);
        if (task) { const u = { ...task, status: a.newStatus, updatedAt: new Date().toISOString() }; await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${u.fileName}`, serializeMarkdownItem(u)); updateItem(u); }
      }
      else if (a.type === 'add_comment' && a.taskId && a.comment) {
        const task = items.find(i => i.id === a.taskId);
        if (task) { const c = { id: `comment-${Date.now()}`, author: currentUser, content: a.comment, createdAt: new Date().toISOString(), mentions: [] }; const u = { ...task, comments: [...(task.comments || []), c], updatedAt: new Date().toISOString() }; await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${u.fileName}`, serializeMarkdownItem(u)); updateItem(u); }
      }
    }
    if (summary) { const nc = noteContent + summary; setNoteContent(nc); saveNote(nc); }
    showToast(`Applied ${sel.length} actions (${tc} tasks created)`, 'success');
    setShowProcessModal(false); setProposedActions(null); setProcessInstruction('');
  };

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
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Space</h1>
          <p className="text-sm text-gray-500">Notes, tasks, and AI tools for {currentUser}</p>
        </div>
        <button onClick={handleCreateNote} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">
          <PlusCircle size={16} /> New Note
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-1/3 border-r bg-white flex flex-col overflow-hidden min-w-[280px]">
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* My Tasks */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2"><CheckSquare size={14} /> My Tasks</h2>
              {myTasks.length > 0 ? (
                <div className="space-y-1">
                  {STATUS_ORDER.map(status => {
                    const tasks = tasksByStatus[status] || [];
                    if (!tasks.length) return null;
                    const collapsed = collapsedGroups.has(status);
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['To Do'];
                    return (
                      <div key={status} className="border rounded-lg overflow-hidden">
                        <button onClick={() => toggleGroup(status)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold ${cfg.color} ${cfg.bg}`}>
                          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          {status} <span className="font-normal text-xs opacity-60 ml-auto">{tasks.length}</span>
                        </button>
                        {!collapsed && <div className="divide-y bg-white">
                          {tasks.map(task => (
                            <div key={task.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer" title="Click to open on board" onClick={() => navigate(`/workspace/item/${task.id}`)}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCycleStatus(task); }}
                                className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                                title={`Click to change: ${task.status} → ${getNextStatus(task)}`}
                              >
                                {cfg.icon}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                                <p className="text-xs text-gray-400">{task.id}</p>
                              </div>
                            </div>
                          ))}
                        </div>}
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-gray-400 px-2 italic flex items-center gap-2"><Coffee size={14} /> No tasks assigned to you.</p>}
            </section>

            {/* My Notes */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><FileText size={14} /> My Notes</span>
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
            </section>
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
                    <button
                      onClick={() => setShowAIBar(!showAIBar)}
                      disabled={isProcessing}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors disabled:opacity-40 ${showAIBar ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}
                      title="Open AI assistant to summarize or extract tasks"
                    >
                      <Sparkles size={13} /> AI Assist
                    </button>
                    {/* Show "AI running" state or normal autosave */}
                    {isProcessing ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 px-3 py-2 rounded-lg">
                        <span className="inline-block w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        AI processing... autosave paused
                      </div>
                    ) : (
                      <AutoSaveIndicator status={asStatus} lastSavedAt={lastSavedAt} error={asError} canUndo={noteCanUndo} onUndo={handleNoteUndo} />
                    )}
                  </div>
                </div>
                <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} onBlur={handleTitleBlur}
                  disabled={isProcessing}
                  className="text-2xl font-bold text-gray-900 border-none outline-none focus:ring-0 p-0 bg-transparent placeholder-gray-300 w-full disabled:opacity-50" placeholder="Note Title" />
                
                {showAIBar && (
                  <div className="flex flex-col gap-2 bg-purple-50 p-3 rounded-lg border border-purple-100 mt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={processInstruction}
                        onChange={(e) => setProcessInstruction(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isProcessing) handleProcessNote(); }}
                        placeholder="What should AI do? (leave blank to extract tasks &amp; summarize)"
                        disabled={isProcessing}
                        className="flex-1 text-sm bg-white border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400 disabled:opacity-50"
                      />
                      {processInstruction && (
                        <button onClick={() => setProcessInstruction('')} className="text-gray-400 hover:text-gray-600 p-1" title="Clear instruction">
                          <X size={14} />
                        </button>
                      )}
                      <button onClick={handleProcessNote} disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                        <Sparkles size={14} /> {isProcessing ? 'Running...' : 'Run'}
                      </button>
                    </div>
                    {/* Quick instruction chips */}
                    {!isProcessing && (
                      <div className="flex flex-wrap gap-1.5">
                        {['Extract action items', 'Write a summary', 'Create tasks from this', 'What decisions were made?'].map(chip => (
                          <button key={chip} onClick={() => setProcessInstruction(chip)}
                            className={`text-[11px] px-2 py-1 rounded border transition-colors ${processInstruction === chip ? 'bg-purple-200 border-purple-300 text-purple-800' : 'bg-white border-purple-200 text-purple-600 hover:bg-purple-100'}`}>
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className={`flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full transition-opacity ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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

          {/* AI Preview Modal */}
          {showProcessModal && proposedActions && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-full flex flex-col">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-purple-50 rounded-t-xl">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-purple-900">
                    <Sparkles size={18} className="text-purple-600" /> AI Proposals
                    <span className="text-sm font-normal text-purple-600">({proposedActions.filter(a => a.selected).length} selected)</span>
                  </h3>
                  <button onClick={() => setShowProcessModal(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  {proposedActions.length === 0 ? <div className="text-center py-8 text-gray-500">No actionable items found.</div> : proposedActions.map((action, i) => {
                    const labels: Record<string, {label: string; color: string}> = {
                      summarize_note: { label: 'Append Summary', color: 'text-purple-600' },
                      create_note: { label: 'New Note', color: 'text-blue-600' },
                      create_task: { label: 'Create Task', color: 'text-green-600' },
                      update_task: { label: 'Update Status', color: 'text-amber-600' },
                      add_comment: { label: 'Add Comment', color: 'text-gray-600' },
                    };
                    const l = labels[action.type] || labels.create_task;
                    const update = (patch: Partial<AIAction>) => { const u = [...proposedActions]; u[i] = { ...u[i], ...patch }; setProposedActions(u); };
                    return (
                      <label key={i} className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition-colors ${action.selected ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                        <input type="checkbox" className="mt-1" checked={action.selected} onChange={() => update({ selected: !action.selected })} />
                        <div className="flex-1">
                          <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ${l.color}`}>{l.label}</span>
                          {action.type === 'summarize_note' && <textarea className="w-full text-sm p-2 border rounded-md" rows={3} value={action.content} onChange={e => update({ content: e.target.value })} />}
                          {action.type === 'create_note' && <><input className="w-full font-medium text-sm p-2 border rounded-md mb-2" value={action.title} onChange={e => update({ title: e.target.value })} /><textarea className="w-full text-sm p-2 border rounded-md" rows={2} value={action.content} onChange={e => update({ content: e.target.value })} /></>}
                          {action.type === 'create_task' && <><div className="flex gap-2 mb-2"><input className="flex-1 font-medium text-sm p-2 border rounded-md" value={action.title} onChange={e => update({ title: e.target.value })} /><input className="w-32 text-sm p-2 border rounded-md" placeholder="Assignee" value={action.assignee || ''} onChange={e => update({ assignee: e.target.value })} /></div></>}
                          {action.type === 'update_task' && <div className="text-sm">Task: {action.taskId} → {action.newStatus}</div>}
                          {action.type === 'add_comment' && <><div className="text-sm mb-1">Task: {action.taskId}</div><textarea className="w-full text-sm p-2 border rounded-md" rows={2} value={action.comment} onChange={e => update({ comment: e.target.value })} /></>}
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                  <button onClick={() => setShowProcessModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg font-medium">Cancel</button>
                  <button onClick={executeAIActions} disabled={!proposedActions?.some(a => a.selected)} className="px-6 py-2 text-sm font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                    Apply Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
