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
          icon: <Loader2 size={16} className="animate-spin" />,
          text: 'Saving...',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          pulse: true,
        };
      case 'saved':
        return {
          icon: <Check size={16} />,
          text: lastSavedAt ? `Saved ${timeAgo}` : 'Saved',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          pulse: false,
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} />,
          text: error || 'Save failed',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          pulse: false,
        };
      case 'idle':
      default:
        return {
          icon: <Check size={16} className="opacity-50" />,
          text: lastSavedAt ? `Saved ${timeAgo}` : 'All changes saved',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          pulse: false,
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border
        ${display.bgColor} ${display.textColor} ${display.borderColor}
        ${display.pulse ? 'animate-pulse' : ''}
        text-sm font-medium shadow-sm
        transition-all duration-300
      `}
      title={error || undefined}
    >
      {display.icon}
      <span className="whitespace-nowrap">{display.text}</span>
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

        // Transition to idle after 3 seconds (still shows "Saved X ago")
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, onSave, delay]);

  return { status, lastSavedAt, error };
}
