import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  FileWatcher,
  detectCloudService,
} from "../../lib/file-watcher";
import chokidar from "chokidar";

describe("detectCloudService", () => {
  it("should detect Dropbox", () => {
    expect(detectCloudService("/Users/test/Dropbox/Workspace")).toBe("Dropbox");
    expect(detectCloudService("C:\\Users\\test\\dropbox\\Project")).toBe(
      "Dropbox",
    );
  });

  it("should detect OneDrive", () => {
    expect(detectCloudService("/Users/test/OneDrive/Workspace")).toBe(
      "OneDrive",
    );
    expect(
      detectCloudService("C:\\Users\\test\\onedrive - personal\\Project"),
    ).toBe("OneDrive");
  });

  it("should detect Google Drive", () => {
    expect(detectCloudService("/Users/test/Google Drive/Workspace")).toBe(
      "Google Drive",
    );
    expect(detectCloudService("C:\\Users\\test\\GoogleDrive\\Project")).toBe(
      "Google Drive",
    );
  });

  it("should return null for non-cloud paths", () => {
    expect(detectCloudService("/Users/test/Documents/Workspace")).toBeNull();
    expect(detectCloudService("C:\\Projects\\App")).toBeNull();
  });
});

describe("FileWatcher", () => {
  const workspacePath = "/fake/workspace/path";

  describe("Initialization", () => {
    it("should initialize correctly", () => {
      const watcher = new FileWatcher(workspacePath);
      expect(watcher.isWatching()).toBe(false);
    });
  });

  describe("Start & Stop", () => {
    let mockOn: ReturnType<typeof vi.fn>;
    let mockClose: ReturnType<typeof vi.fn>;
    let watcher: FileWatcher;

    beforeEach(() => {
      mockOn = vi.fn().mockReturnThis();
      mockClose = vi.fn();

      vi.spyOn(chokidar, "watch").mockReturnValue({
        on: mockOn,
        close: mockClose,
      } as unknown as import("chokidar").FSWatcher);

      watcher = new FileWatcher(workspacePath);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should start watching with correct configuration", () => {
      watcher.start();

      expect(chokidar.watch).toHaveBeenCalledWith(
        "**/*.md",
        expect.objectContaining({
          cwd: workspacePath,
          ignored: [".syncboard/**", "**/node_modules/**", "**/.git/**"],
          persistent: true,
          ignoreInitial: true,
        }),
      );

      expect(mockOn).toHaveBeenCalledWith("add", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("change", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("unlink", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));

      expect(watcher.isWatching()).toBe(true);
    });

    it("should not start a new watcher if already watching", () => {
      watcher.start();
      expect(chokidar.watch).toHaveBeenCalledTimes(1);

      watcher.start();
      expect(chokidar.watch).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it("should stop watching", () => {
      watcher.start();
      expect(watcher.isWatching()).toBe(true);

      watcher.stop();

      expect(mockClose).toHaveBeenCalled();
      expect(watcher.isWatching()).toBe(false);
    });

    it("should handle stop when not watching", () => {
      expect(watcher.isWatching()).toBe(false);
      watcher.stop(); // Should not throw
      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe("Event Handling & Debouncing", () => {
    let mockOn: ReturnType<typeof vi.fn>;
    let eventHandlers: Record<string, (...args: unknown[]) => void>;
    let watcher: FileWatcher;

    beforeEach(() => {
      vi.useFakeTimers();

      eventHandlers = {};
      mockOn = vi
        .fn()
        .mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
          eventHandlers[event] = handler;
          return { on: mockOn }; // Return mocked chainable object
        });

      vi.spyOn(chokidar, "watch").mockReturnValue({
        on: mockOn,
        close: vi.fn(),
      } as unknown as import("chokidar").FSWatcher);

      watcher = new FileWatcher(workspacePath);
      watcher.start();
    });

    afterEach(() => {
      watcher.stop();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("should debounce events and call handler after delay", () => {
      const handler = vi.fn();
      watcher.onChange(handler);

      const relativePath = "test.md";

      // Trigger 'change' event
      eventHandlers["change"](relativePath);

      // Handler should not be called immediately
      expect(handler).not.toHaveBeenCalled();

      // Advance time slightly, but not enough
      vi.advanceTimersByTime(1000);
      expect(handler).not.toHaveBeenCalled();

      // Advance time past the debounce delay (2000ms)
      vi.advanceTimersByTime(1000);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        type: "change",
        path: `${workspacePath}/${relativePath}`,
        relativePath,
      });
    });

    it("should reset debounce timer if another event occurs for the same file", () => {
      const handler = vi.fn();
      watcher.onChange(handler);

      const relativePath = "rapid.md";

      // Trigger first event
      eventHandlers["add"](relativePath);

      // Advance time partially
      vi.advanceTimersByTime(1500);

      // Trigger second event for the SAME file before the first one completes
      eventHandlers["change"](relativePath);

      // Advance time by enough to trigger the FIRST event, but not the second
      vi.advanceTimersByTime(1000);
      // 1500 + 1000 = 2500 total, but timer was reset at 1500
      expect(handler).not.toHaveBeenCalled();

      // Advance time to complete the SECOND timer
      vi.advanceTimersByTime(1000); // Now at 3500 total, 2000 since second event

      // Should only be called once, with the LATEST event type
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        type: "change",
        path: `${workspacePath}/${relativePath}`,
        relativePath,
      });
    });

    it("should process events for different files independently", () => {
      const handler = vi.fn();
      watcher.onChange(handler);

      eventHandlers["add"]("file1.md");
      eventHandlers["change"]("file2.md");

      vi.advanceTimersByTime(2500);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ relativePath: "file1.md" }),
      );
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ relativePath: "file2.md" }),
      );
    });

    it("should handle unsubscription", () => {
      const handler = vi.fn();
      const unsubscribe = watcher.onChange(handler);

      eventHandlers["add"]("test.md");

      // Unsubscribe before timer fires
      unsubscribe();

      vi.advanceTimersByTime(2500);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should not crash if a handler throws an error", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const failingHandler = vi.fn().mockImplementation(() => {
        throw new Error("Handler error");
      });
      const succeedingHandler = vi.fn();

      watcher.onChange(failingHandler);
      watcher.onChange(succeedingHandler);

      eventHandlers["unlink"]("delete.md");

      // This should not throw an unhandled exception
      vi.advanceTimersByTime(2500);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in file change handler:",
        expect.any(Error),
      );
      expect(failingHandler).toHaveBeenCalled();
      expect(succeedingHandler).toHaveBeenCalled(); // Subsequent handlers should still run
    });
  });
});
