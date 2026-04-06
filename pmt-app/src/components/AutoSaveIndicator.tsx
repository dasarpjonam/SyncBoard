import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

interface Props {
  status: SaveStatus;
  lastSavedAt?: Date;
  error?: string;
}

export function AutoSaveIndicator({ status, lastSavedAt, error }: Props) {
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

  const getStatusDisplay = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 size={14} className="animate-spin" />,
          text: 'Saving...',
          color: 'text-gray-600',
        };
      case 'saved':
        return {
          icon: <Check size={14} />,
          text: lastSavedAt ? `Saved ${timeAgo}` : 'Saved',
          color: 'text-green-600',
        };
      case 'error':
        return {
          icon: <AlertCircle size={14} />,
          text: error || 'Save failed',
          color: 'text-red-600',
        };
      default:
        return null;
    }
  };

  const display = getStatusDisplay();

  if (!display) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${display.color}`}
      title={error || undefined}
    >
      {display.icon}
      <span>{display.text}</span>
    </div>
  );
}

/**
 * Custom hook for managing auto-save state
 */
export function useAutoSave<T>(
  value: T | null,
  onSave: (value: T) => Promise<void>,
  delay: number = 500
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    // Skip if no value
    if (value === null || value === undefined) return;

    setStatus('saving');
    const timeoutId = setTimeout(async () => {
      try {
        await onSave(value);
        setStatus('saved');
        setLastSavedAt(new Date());
        setError(undefined);

        // Fade out saved indicator after 2 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, onSave, delay]);

  return { status, lastSavedAt, error };
}
