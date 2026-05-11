import { useEffect, useRef, useState, useCallback } from 'react';
import { Check, Loader2, AlertCircle, Undo2 } from 'lucide-react';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

interface Props {
  status: SaveStatus;
  lastSavedAt?: Date;
  error?: string;
  /** Called when user clicks Undo within the 5-second grace window */
  onUndo?: () => void;
  /** Whether undo is currently available */
  canUndo?: boolean;
}

export function AutoSaveIndicator({ status, lastSavedAt, error, onUndo, canUndo }: Props) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastSavedAt) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const seconds = Math.floor((now.getTime() - lastSavedAt.getTime()) / 1000);

      if (seconds < 5) {
        setTimeAgo('just now');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`${minutes}m ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-blue-50 text-blue-700 border-blue-200 text-sm font-medium transition-all duration-300 animate-pulse">
        <Loader2 size={14} className="animate-spin" />
        <span className="whitespace-nowrap">Saving…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-red-50 text-red-700 border-red-200 text-sm font-medium" title={error}>
        <AlertCircle size={14} />
        <span className="whitespace-nowrap">{error || 'Save failed'}</span>
      </div>
    );
  }

  // saved or idle — show "Saved · Undo" if undo is available, otherwise compact indicator
  const savedText = lastSavedAt ? `Saved ${timeAgo}` : 'All changes saved';

  return (
    <div className="flex items-center gap-1 text-sm font-medium transition-all duration-300">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-500">
        <Check size={13} className={status === 'saved' ? 'text-green-500' : 'text-gray-400'} />
        <span className="whitespace-nowrap text-xs">{savedText}</span>
      </div>
      {canUndo && onUndo && (
        <button
          onClick={onUndo}
          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors font-medium"
          title="Undo last save"
        >
          <Undo2 size={12} />
          Undo
        </button>
      )}
    </div>
  );
}

/**
 * Custom hook for managing auto-save state with undo support.
 * - Pauses when value is null (pass null to pause, e.g. during AI processing).
 * - Keeps a previous-value snapshot for a 5-second undo window.
 * - Returns an `undo()` function that restores the snapshot via the provided `onUndo` callback.
 */
export function useAutoSave<T>(
  value: T | null,
  onSave: (value: T) => Promise<void>,
  delay: number = 500,
  onUndo?: (previousValue: T) => void,
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date>();
  const [error, setError] = useState<string>();
  const [canUndo, setCanUndo] = useState(false);

  // Snapshot stored in state (not ref) so handleUndo closure always has current value
  const [undoSnapshot, setUndoSnapshot] = useState<T | null>(null);
  const lastSavedValueRef = useRef<T | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUndo = useCallback(() => {
    if (undoSnapshot !== null && onUndo) {
      onUndo(undoSnapshot);
    }
    setCanUndo(false);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, [undoSnapshot, onUndo]);

  useEffect(() => {
    // Pause when value is null (e.g. AI processing, new item not yet created)
    if (value === null || value === undefined) return;

    setStatus('saving');
    const timeoutId = setTimeout(async () => {
      // Capture the previously-saved value as the undo target
      const previouslySaved = lastSavedValueRef.current;

      try {
        await onSave(value);

        // After successful save, update ref to current saved value
        lastSavedValueRef.current = value;

        setStatus('saved');
        setLastSavedAt(new Date());
        setError(undefined);

        // Offer undo only if there's a previous version to restore
        if (previouslySaved !== null && onUndo) {
          setUndoSnapshot(previouslySaved);
          setCanUndo(true);
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
          undoTimerRef.current = setTimeout(() => {
            setCanUndo(false);
          }, 5000);
        }

        setTimeout(() => setStatus('idle'), 3000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, onSave, delay, onUndo]);

  // Cleanup undo timer on unmount
  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  return { status, lastSavedAt, error, canUndo, handleUndo };
}
