import React, { useState, useRef, KeyboardEvent } from 'react';
import { PersonalTodo } from '../types';
import { useWorkspace } from '../store/WorkspaceContext';
import { useToast } from './Toast';
import { createTodo } from '../lib/personal-store';
import { Circle, CheckCircle2, Trash2, Calendar, ChevronDown, ChevronRight, X, FileUp } from 'lucide-react';

interface PersonalTodoListProps {
  onImport?: () => void;
}

function formatDateBadge(targetDate: string): { text: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + 'T00:00:00');
  const diff = target.getTime() - today.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return { text: 'Today', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  if (days < 0) return { text: days === -1 ? 'Yesterday' : `${Math.abs(days)}d overdue`, color: 'text-red-600 bg-red-50 border-red-200' };
  if (days === 1) return { text: 'Tomorrow', color: 'text-blue-600 bg-blue-50 border-blue-200' };
  if (days <= 7) return { text: `${days}d`, color: 'text-gray-600 bg-gray-50 border-gray-200' };
  
  const month = target.toLocaleString('default', { month: 'short' });
  const day = target.getDate();
  return { text: `${month} ${day}`, color: 'text-gray-600 bg-gray-50 border-gray-200' };
}

function TodoRow({ todo, onToggle, onUpdate, onDelete }: {
  todo: PersonalTodo;
  onToggle: (id: string) => void;
  onUpdate: (todo: PersonalTodo) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    setEditing(true);
    setEditText(todo.text);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== todo.text) {
      onUpdate({ ...todo, text: editText.trim(), updatedAt: new Date().toISOString() });
    }
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  const badge = todo.targetDate ? formatDateBadge(todo.targetDate) : null;
  const isOverdue = badge && badge.color.includes('red') && !todo.done;

  return (
    <div className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors ${todo.done ? 'opacity-60' : ''}`}>
      <button
        onClick={() => onToggle(todo.id)}
        className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-blue-500 transition-colors"
      >
        {todo.done ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} />}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      ) : (
        <div className="flex-1 min-w-0">
          <span
            onClick={handleStartEdit}
            className={`cursor-pointer text-sm ${todo.done ? 'line-through text-gray-500' : 'text-gray-800'}`}
          >
            {todo.text}
          </span>
          {badge && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 border rounded ${badge.color}`}>
                {badge.text}
              </span>
              {todo.recurrence && (
                <span className="text-xs text-gray-400">
                  {todo.recurrence === 'weekly' ? '↻ Weekly' : '↻ Monthly'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onDelete(todo.id)}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
        title="Delete todo"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function AddTodoRow({ onAdd }: { onAdd: (todo: PersonalTodo) => void }) {
  const [text, setText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [recurrence, setRecurrence] = useState<'weekly' | 'monthly' | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!text.trim()) return;
    const todo = createTodo(text.trim(), targetDate || undefined, recurrence);
    onAdd(todo);
    setText('');
    setTargetDate('');
    setRecurrence(undefined);
    setShowDatePicker(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  const clearDate = () => {
    setTargetDate('');
    setRecurrence(undefined);
    setShowDatePicker(false);
  };

  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
      <Circle size={18} className="flex-shrink-0 mt-0.5 text-gray-300" />
      
      <div className="flex-1">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new todo…"
          className="w-full text-sm text-gray-800 placeholder-gray-400 outline-none"
        />
        
        {showDatePicker && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {targetDate && (
              <>
                <select
                  value={recurrence || ''}
                  onChange={e => setRecurrence(e.target.value as 'weekly' | 'monthly' || undefined)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button
                  onClick={clearDate}
                  className="text-gray-400 hover:text-gray-600"
                  title="Clear date"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        )}
        
        {!showDatePicker && !targetDate && (
          <button
            onClick={() => setShowDatePicker(true)}
            className="text-xs text-gray-400 hover:text-gray-600 mt-1 flex items-center gap-1"
          >
            <Calendar size={12} /> Add date
          </button>
        )}
      </div>

      <button
        onClick={handleAdd}
        disabled={!text.trim()}
        className="flex-shrink-0 px-3 py-1 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Add
      </button>
    </div>
  );
}

export function PersonalTodoList({ onImport }: PersonalTodoListProps) {
  const { todos, addTodo, updateTodo, deleteTodo, toggleTodoDone, currentUser } = useWorkspace();
  const { showToast } = useToast();
  const [showCompleted, setShowCompleted] = useState(false);
  const [deletedTodo, setDeletedTodo] = useState<{ todo: PersonalTodo; timer: NodeJS.Timeout } | null>(null);

  const activeTodos = todos.filter(t => !t.done).sort((a, b) => {
    // Sort by: overdue first, then by targetDate ascending, then by createdAt descending
    const aDate = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
    const bDate = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
    const now = Date.now();
    const aOverdue = aDate < now ? 1 : 0;
    const bOverdue = bDate < now ? 1 : 0;
    
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;
    if (aDate !== bDate) return aDate - bDate;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const doneTodos = todos.filter(t => t.done).sort((a, b) => {
    const aDone = a.doneAt ? new Date(a.doneAt).getTime() : 0;
    const bDone = b.doneAt ? new Date(b.doneAt).getTime() : 0;
    return bDone - aDone;
  });

  const handleAdd = async (todo: PersonalTodo) => {
    await addTodo(todo);
    showToast('Todo added', 'success');
  };

  const handleToggle = async (id: string) => {
    await toggleTodoDone(id);
  };

  const handleUpdate = async (todo: PersonalTodo) => {
    await updateTodo(todo);
    showToast('Todo updated', 'success');
  };

  const handleDelete = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Optimistically remove
    await deleteTodo(id);

    // Show undo toast
    const timer = setTimeout(() => {
      setDeletedTodo(null);
    }, 5000);

    setDeletedTodo({ todo, timer });
    showToast(
      <div className="flex items-center justify-between gap-3">
        <span>Todo deleted</span>
        <button
          onClick={async () => {
            if (deletedTodo) {
              clearTimeout(deletedTodo.timer);
              await addTodo(deletedTodo.todo);
              setDeletedTodo(null);
              showToast('Todo restored', 'success');
            }
          }}
          className="text-sm font-medium underline hover:no-underline"
        >
          Undo
        </button>
      </div>,
      'info'
    );
  };

  const handleImportClick = async () => {
    try {
      const jsonContent = await window.electronAPI.openJsonFile();
      if (!jsonContent) return;

      const { importTodosFromJson } = await import('../lib/personal-store');
      const { todos: newTodos, imported, skipped } = importTodosFromJson(jsonContent, todos);
      
      if (imported > 0) {
        for (const todo of newTodos) {
          if (!todos.find(t => t.id === todo.id)) {
            await addTodo(todo);
          }
        }
        showToast(`Imported ${imported} todo${imported !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}`, 'success');
      } else {
        showToast('No new todos to import', 'info');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to import todos', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Circle size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Select a user in Settings to manage personal todos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Personal Todos</h2>
        <button
          onClick={handleImportClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        >
          <FileUp size={14} />
          Import…
        </button>
      </div>

      {/* Add Todo */}
      <div className="mb-6">
        <AddTodoRow onAdd={handleAdd} />
      </div>

      {/* Active Todos */}
      <div className="space-y-1 mb-6">
        {activeTodos.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No active todos. Add one above to get started!
          </div>
        )}
        {activeTodos.map(todo => (
          <TodoRow
            key={todo.id}
            todo={todo}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Completed Section */}
      {doneTodos.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2 transition-colors"
          >
            {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="font-medium">Completed ({doneTodos.length})</span>
          </button>
          {showCompleted && (
            <div className="space-y-1 mt-2">
              {doneTodos.map(todo => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
