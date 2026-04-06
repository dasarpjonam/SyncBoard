import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AutoSaveIndicator, useAutoSave, SaveStatus } from './AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render "Saving..." when status is saving', () => {
    render(<AutoSaveIndicator status="saving" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should render "Saved" when status is saved without timestamp', () => {
    render(<AutoSaveIndicator status="saved" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
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

  it('should render nothing when status is idle', () => {
    const { container } = render(<AutoSaveIndicator status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('should show spinner icon when saving', () => {
    const { container } = render(<AutoSaveIndicator status="saving" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show check icon when saved', () => {
    render(<AutoSaveIndicator status="saved" />);
    // Check for presence of SVG (lucide-react renders as SVG)
    const svg = screen.getByText('Saved').parentElement?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should update time ago periodically', async () => {
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const { rerender } = render(<AutoSaveIndicator status="saved" lastSavedAt={fiveSecondsAgo} />);
    
    expect(screen.getByText('Saved 5s ago')).toBeInTheDocument();

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should update to 10s ago
    await waitFor(() => {
      expect(screen.getByText('Saved 10s ago')).toBeInTheDocument();
    });
  });

  it('should apply correct color classes for different statuses', () => {
    const { container: savingContainer } = render(<AutoSaveIndicator status="saving" />);
    expect(savingContainer.querySelector('.text-gray-600')).toBeInTheDocument();

    const { container: savedContainer } = render(<AutoSaveIndicator status="saved" />);
    expect(savedContainer.querySelector('.text-green-600')).toBeInTheDocument();

    const { container: errorContainer } = render(<AutoSaveIndicator status="error" />);
    expect(errorContainer.querySelector('.text-red-600')).toBeInTheDocument();
  });
});

describe('useAutoSave hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call onSave after delay', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = () => {
      const { status } = useAutoSave('test value', mockSave, 500);
      return <div>{status}</div>;
    };

    render(<TestComponent />);

    // Should show saving immediately
    expect(screen.getByText('saving')).toBeInTheDocument();

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Wait for save to complete
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith('test value');
      expect(screen.getByText('saved')).toBeInTheDocument();
    });
  });

  it('should debounce multiple value changes', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = ({ value }: { value: string }) => {
      const { status } = useAutoSave(value, mockSave, 500);
      return <div>{status}</div>;
    };

    const { rerender } = render(<TestComponent value="first" />);

    // Change value multiple times quickly
    rerender(<TestComponent value="second" />);
    rerender(<TestComponent value="third" />);

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should only save once with the latest value
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith('third');
    });
  });

  it('should handle save errors', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Failed to save'));
    const TestComponent = () => {
      const { status, error } = useAutoSave('test value', mockSave, 500);
      return <div>{status} {error}</div>;
    };

    render(<TestComponent />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText(/error/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
    });
  });

  it('should set lastSavedAt after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = () => {
      const { lastSavedAt } = useAutoSave('test value', mockSave, 500);
      return <div>{lastSavedAt ? 'Has timestamp' : 'No timestamp'}</div>;
    };

    render(<TestComponent />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText('Has timestamp')).toBeInTheDocument();
    });
  });

  it('should fade to idle after 2 seconds of saved status', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const TestComponent = () => {
      const { status } = useAutoSave('test value', mockSave, 500);
      return <div>{status}</div>;
    };

    render(<TestComponent />);

    // Wait for save
    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText('saved')).toBeInTheDocument();
    });

    // Wait 2 more seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByText('idle')).toBeInTheDocument();
    });
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
});
