import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AutoSaveIndicator, useAutoSave, SaveStatus } from '../../src/components/AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render "Saving…" when status is saving', () => {
    render(<AutoSaveIndicator status="saving" />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('should render "Saved" when status is saved without timestamp', () => {
    render(<AutoSaveIndicator status="saved" />);
    // New design: without a timestamp it shows 'All changes saved' in saved/idle state
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
  });

  it('should render "Saved just now" when status is saved with recent timestamp', () => {
    const now = new Date();
    render(<AutoSaveIndicator status="saved" lastSavedAt={now} />);
    expect(screen.getByText('Saved just now')).toBeInTheDocument();
  });

  it('should render "Saved Xs ago" when status is saved with timestamp seconds ago', () => {
    const tenSecondsAgo = new Date(Date.now() - 10000);
    render(<AutoSaveIndicator status="saved" lastSavedAt={tenSecondsAgo} />);
    expect(screen.getByText('Saved 10s ago')).toBeInTheDocument();
  });

  it('should render "Saved Xm ago" when status is saved with timestamp minutes ago', () => {
    const twoMinutesAgo = new Date(Date.now() - 120000);
    render(<AutoSaveIndicator status="saved" lastSavedAt={twoMinutesAgo} />);
    expect(screen.getByText('Saved 2m ago')).toBeInTheDocument();
  });

  it('should render "Saved Xh ago" when status is saved with timestamp hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 7200000);
    render(<AutoSaveIndicator status="saved" lastSavedAt={twoHoursAgo} />);
    expect(screen.getByText('Saved 2h ago')).toBeInTheDocument();
  });

  it('should render error message when status is error', () => {
    render(<AutoSaveIndicator status="error" error="Network failure" />);
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('should render default error message when status is error without custom message', () => {
    render(<AutoSaveIndicator status="error" />);
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('should render persistent message when status is idle', () => {
    render(<AutoSaveIndicator status="idle" />);
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
  });

  it('should render "Saved X ago" when status is idle with timestamp', () => {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    render(<AutoSaveIndicator status="idle" lastSavedAt={oneMinuteAgo} />);
    expect(screen.getByText('Saved 1m ago')).toBeInTheDocument();
  });

  it('should show spinner icon when saving', () => {
    const { container } = render(<AutoSaveIndicator status="saving" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show check icon when saved', () => {
    render(<AutoSaveIndicator status="saved" />);
    // The new design renders a check icon next to the text
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should update time ago periodically', async () => {
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    render(<AutoSaveIndicator status="saved" lastSavedAt={fiveSecondsAgo} />);
    
    expect(screen.getByText('Saved 5s ago')).toBeInTheDocument();

    // Advance timer by 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Should update to 10s ago
    expect(screen.getByText('Saved 10s ago')).toBeInTheDocument();
  });

  it('should apply correct color classes for different statuses', () => {
    const { container: savingContainer } = render(<AutoSaveIndicator status="saving" />);
    expect(savingContainer.querySelector('.text-blue-700')).toBeInTheDocument();
    expect(savingContainer.querySelector('.bg-blue-50')).toBeInTheDocument();

    const { container: errorContainer } = render(<AutoSaveIndicator status="error" />);
    expect(errorContainer.querySelector('.text-red-700')).toBeInTheDocument();
    expect(errorContainer.querySelector('.bg-red-50')).toBeInTheDocument();
  });

  it('should show Undo button when canUndo is true and onUndo is provided', () => {
    const onUndo = vi.fn();
    render(<AutoSaveIndicator status="idle" canUndo={true} onUndo={onUndo} />);
    const undoBtn = screen.getByTitle('Undo last save');
    expect(undoBtn).toBeInTheDocument();
    undoBtn.click();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('should not show Undo button when canUndo is false', () => {
    render(<AutoSaveIndicator status="idle" canUndo={false} onUndo={vi.fn()} />);
    expect(screen.queryByTitle('Undo last save')).not.toBeInTheDocument();
  });
});

describe('useAutoSave hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should call onSave after delay', async () => {
    vi.useRealTimers(); // Use real timers for this test
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = () => {
      const { status } = useAutoSave('test value', mockSave, 100); // Shorter delay for test
      return <div data-testid="status">{status}</div>;
    };

    const { getByTestId } = render(<TestComponent />);

    // Should show saving immediately
    expect(getByTestId('status').textContent).toBe('saving');

    // Wait for save to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(mockSave).toHaveBeenCalledWith('test value');
    // Should be saved now (before the 3 second idle timeout)
    expect(getByTestId('status').textContent).toBe('saved');
    
    vi.useFakeTimers(); // Restore fake timers
  });

  it('should debounce multiple value changes', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = ({ value }: { value: string }) => {
      const { status } = useAutoSave(value, mockSave, 500);
      return <div data-testid="status">{status}</div>;
    };

    const { rerender } = render(<TestComponent value="first" />);

    // Change value multiple times quickly
    rerender(<TestComponent value="second" />);
    rerender(<TestComponent value="third" />);

    // Advance timer
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Should only save once with the latest value
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith('third');
  });

  it('should handle save errors', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Failed to save'));
    const TestComponent = () => {
      const { status, error } = useAutoSave('test value', mockSave, 500);
      return <div data-testid="result">{status} {error}</div>;
    };

    const { getByTestId } = render(<TestComponent />);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const result = getByTestId('result').textContent;
    expect(result).toContain('error');
    expect(result).toContain('Failed to save');
  });

  it('should set lastSavedAt after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = () => {
      const { lastSavedAt } = useAutoSave('test value', mockSave, 500);
      return <div data-testid="timestamp">{lastSavedAt ? 'Has timestamp' : 'No timestamp'}</div>;
    };

    const { getByTestId } = render(<TestComponent />);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(getByTestId('timestamp').textContent).toBe('Has timestamp');
  });

  it('should fade to idle after 3 seconds of saved status', async () => {
    vi.useRealTimers(); // Use real timers for this test
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = () => {
      const { status } = useAutoSave('test value', mockSave, 100); // Shorter delay for test
      return <div data-testid="status">{status}</div>;
    };

    const { getByTestId } = render(<TestComponent />);

    // Wait for save
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be saved now
    expect(getByTestId('status').textContent).toBe('saved');

    // Wait 3 more seconds for transition to idle (use shorter time for test)
    await new Promise(resolve => setTimeout(resolve, 3100));

    // Should now be idle
    expect(getByTestId('status').textContent).toBe('idle');
    
    vi.useFakeTimers(); // Restore fake timers
  });

  it('should not save when value is null or undefined', () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = ({ value }: { value: any }) => {
      const { status } = useAutoSave(value, mockSave, 500);
      return <div>{status}</div>;
    };

    const { rerender } = render(<TestComponent value={null} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockSave).not.toHaveBeenCalled();

    rerender(<TestComponent value={undefined} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should call onUndo with the previous snapshot after second save', async () => {
    vi.useRealTimers();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockUndo = vi.fn();

    const TestComponent = ({ value }: { value: string }) => {
      const { handleUndo, canUndo } = useAutoSave(value, mockSave, 50, mockUndo);
      return (
        <div>
          <span data-testid="canUndo">{String(canUndo)}</span>
          <button onClick={handleUndo}>Undo</button>
        </div>
      );
    };

    const { rerender, getByText, getByTestId } = render(<TestComponent value="first" />);
    await new Promise(resolve => setTimeout(resolve, 80)); // first save

    // Second value — first is now the "previous snapshot"
    rerender(<TestComponent value="second" />);
    await new Promise(resolve => setTimeout(resolve, 80)); // second save

    expect(getByTestId('canUndo').textContent).toBe('true');

    getByText('Undo').click();
    expect(mockUndo).toHaveBeenCalledWith('first');

    vi.useFakeTimers();
  });
});
