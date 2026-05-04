import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationManager } from '../../src/lib/notification-manager';
import { Notification } from '../../src/types';

describe('NotificationManager', () => {
  let mockElectronAPI: { ensureDir: import("vitest").Mock, readFile: import("vitest").Mock, writeFile: import("vitest").Mock };
  let manager: NotificationManager;

  const mockTimestamp1 = '2023-10-01T12:00:00.000Z';
  const mockTimestamp2 = '2023-10-02T12:00:00.000Z';

  const mockNotification1: Notification = {
    id: 'n1',
    type: 'mention',
    title: 'Mention',
    message: 'Hello @user',
    targetId: 'ITEM-1',
    actor: 'alice',
    recipient: 'bob',
    timestamp: mockTimestamp1,
    read: false
  };

  const mockNotification2: Notification = {
    id: 'n2',
    type: 'assignment',
    title: 'Assigned',
    message: 'You were assigned to ITEM-2',
    targetId: 'ITEM-2',
    actor: 'charlie',
    recipient: 'bob',
    timestamp: mockTimestamp2,
    read: true
  };

  beforeEach(() => {
    mockElectronAPI = {
      ensureDir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined)
    };
    manager = new NotificationManager('/mock/workspace', mockElectronAPI);
  });

  describe('parseNotifications', () => {
    it('should parse valid notification file content', () => {
      const content = manager.serializeNotifications([mockNotification2, mockNotification1]);

      const notifications = manager.parseNotifications(content);

      expect(notifications.length).toBe(2);

      // Should sort newest first
      expect(notifications[0].id).toBe('n2');
      expect(notifications[0].type).toBe('assignment');
      expect(notifications[0].read).toBe(true);
      expect(notifications[0].message).toBeDefined();

      expect(notifications[1].id).toBe('n1');
      expect(notifications[1].type).toBe('mention');
      expect(notifications[1].read).toBe(false);
      expect(notifications[1].message).toBeDefined();
    });

    it('should handle pure yaml notification without frontmatter formatting', () => {
      const content = `id: n1\ntype: system\ntitle: System Update\nrecipient: admin\ntimestamp: '${mockTimestamp1}'\nread: false\nmessage: System updated successfully`;

      const notifications = manager.parseNotifications(content);

      expect(notifications.length).toBe(1);
      expect(notifications[0].id).toBe('n1');
      expect(notifications[0].message).toContain('System updated successfully');
      expect(notifications[0].type).toBe('system');
    });

    it('should ignore items without an id', () => {
      const content = `type: mention\ntitle: Mention`;
      const notifications = manager.parseNotifications(content);
      expect(notifications.length).toBe(0);
    });

    it('should provide default values for missing optional fields', () => {
      const content = `id: minimal-n\nrecipient: charlie\nmessage: Minimal body`;
      const notifications = manager.parseNotifications(content);

      expect(notifications.length).toBe(1);
      expect(notifications[0].id).toBe('minimal-n');
      expect(notifications[0].type).toBe('system'); // default
      expect(notifications[0].title).toBe('Notification'); // default
      expect(notifications[0].message).toContain('Minimal body'); // from body
      expect(notifications[0].read).toBe(false); // default
      expect(notifications[0].timestamp).toBeDefined(); // should set a date
    });
  });

  describe('serializeNotifications', () => {
    it('should correctly serialize notifications to markdown with frontmatter', () => {
      const notifications = [mockNotification1, mockNotification2];
      const result = manager.serializeNotifications(notifications);

      expect(result).toContain('id: n1');
      expect(result).toContain('type: mention');
      expect(result).toContain('recipient: bob');
      expect(result).toContain('Hello @user');
      expect(result).toContain('---');

      expect(result).toContain('id: n2');
      expect(result).toContain('You were assigned to ITEM-2');
    });
  });

  describe('loadNotifications', () => {
    it('should read file and parse notifications', async () => {
      mockElectronAPI.readFile.mockResolvedValue(`id: test-load\nrecipient: bob\nmessage: Load test body\ntimestamp: '${mockTimestamp1}'`);

      const notifications = await manager.loadNotifications('bob');

      expect(mockElectronAPI.readFile).toHaveBeenCalledWith('/mock/workspace/.syncboard/notifications/bob.md');
      expect(notifications.length).toBe(1);
      expect(notifications[0].id).toBe('test-load');
      expect(notifications[0].recipient).toBe('bob');
      expect(notifications[0].message).toContain('Load test body');
    });

    it('should return empty array if file does not exist or is empty', async () => {
      mockElectronAPI.readFile.mockResolvedValue(null);
      const notifications = await manager.loadNotifications('bob');
      expect(notifications).toEqual([]);
    });

    it('should return empty array on file read error', async () => {
      mockElectronAPI.readFile.mockRejectedValue(new Error('File access denied'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const notifications = await manager.loadNotifications('bob');

      expect(notifications).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveNotifications', () => {
    it('should ensure directory and write serialized content to correct path', async () => {
      await manager.saveNotifications('bob', [mockNotification1]);

      expect(mockElectronAPI.ensureDir).toHaveBeenCalledWith('/mock/workspace/.syncboard/notifications');
      expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
        '/mock/workspace/.syncboard/notifications/bob.md',
        expect.stringContaining('id: n1')
      );
    });

    it('should catch and log errors during save', async () => {
      mockElectronAPI.writeFile.mockRejectedValue(new Error('Disk full'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await manager.saveNotifications('bob', [mockNotification1]);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('processNotifications', () => {
    it('should return early if no notifications are provided', async () => {
      await manager.processNotifications([]);
      expect(mockElectronAPI.ensureDir).not.toHaveBeenCalled();
      expect(mockElectronAPI.readFile).not.toHaveBeenCalled();
    });

    it('should group notifications by recipient and merge with existing ones', async () => {
      // Mock existing notifications for 'bob'
      mockElectronAPI.readFile.mockResolvedValue(`id: existing-1\nrecipient: bob\ntimestamp: '2023-09-01T12:00:00.000Z'`);

      const newNotifs = [mockNotification1, mockNotification2]; // both for 'bob'

      await manager.processNotifications(newNotifs);

      expect(mockElectronAPI.readFile).toHaveBeenCalledWith('/mock/workspace/.syncboard/notifications/bob.md');

      expect(mockElectronAPI.writeFile).toHaveBeenCalled();
      const writeCallArg = mockElectronAPI.writeFile.mock.calls[0][1];

      expect(writeCallArg).toContain('id: n1');
      expect(writeCallArg).toContain('id: n2');
      expect(writeCallArg).toContain('id: existing-1');
    });

    it('should keep only the last 100 notifications for a recipient', async () => {
      // Create 100 existing notifications correctly structured
      // But loadNotifications needs to return them.
      // Because `parseNotifications` uses pure YAML fallback which parses `message` inside the body if it fails,
      // it might parse all 100. BUT `processNotifications` calls `loadNotifications`.
      // Let's mock loadNotifications entirely to avoid dealing with file string format differences!
      vi.spyOn(manager, 'loadNotifications').mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          id: `old-${i}`,
          type: 'system',
          title: 'Old',
          message: 'Old body',
          recipient: 'alice',
          timestamp: '2023-01-01T12:00:00.000Z',
          read: true
        } as Notification))
      );

      const newNotif: Notification = {
        ...mockNotification1,
        id: 'new-1',
        recipient: 'alice'
      };

      await manager.processNotifications([newNotif]);

      expect(mockElectronAPI.writeFile).toHaveBeenCalled();
      const writeCallArg = mockElectronAPI.writeFile.mock.calls[0][1];

      // Let's count "id: " to verify the limit. Should be 100 max.
      const matches = writeCallArg.match(/id:/g);
      expect(matches?.length).toBe(100);
      expect(writeCallArg).toContain('id: new-1');
      // The last one `old-99` should be truncated
      expect(writeCallArg).not.toContain('id: old-99');
    });

    it('should handle notifications for multiple recipients independently', async () => {
      mockElectronAPI.readFile.mockResolvedValue(''); // No existing notifications

      const notifBob: Notification = { ...mockNotification1, recipient: 'bob' };
      const notifAlice: Notification = { ...mockNotification2, recipient: 'alice' };

      await manager.processNotifications([notifBob, notifAlice]);

      // Should load and save for both
      expect(mockElectronAPI.readFile).toHaveBeenCalledWith('/mock/workspace/.syncboard/notifications/bob.md');
      expect(mockElectronAPI.readFile).toHaveBeenCalledWith('/mock/workspace/.syncboard/notifications/alice.md');

      expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
        '/mock/workspace/.syncboard/notifications/bob.md',
        expect.stringContaining('id: n1')
      );
      expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
        '/mock/workspace/.syncboard/notifications/alice.md',
        expect.stringContaining('id: n2')
      );
    });
  });
});
