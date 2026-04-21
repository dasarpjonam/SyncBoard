import { Notification } from '../types';
import yaml from 'js-yaml';

/**
 * A notification file contains a list of notifications serialized as Markdown.
 * We store them per user in .syncboard/notifications/<username>.md
 */

const NOTIFICATIONS_DIR = '.syncboard/notifications';

export class NotificationManager {
  private workspacePath: string;
  private electronAPI: any;

  constructor(workspacePath: string, electronAPI: any) {
    this.workspacePath = workspacePath;
    this.electronAPI = electronAPI;
  }

  private async ensureDir() {
    await this.electronAPI.ensureDir(`${this.workspacePath}/${NOTIFICATIONS_DIR}`);
  }

  private getFilePath(username: string) {
    return `${this.workspacePath}/${NOTIFICATIONS_DIR}/${username}.md`;
  }

  async loadNotifications(username: string): Promise<Notification[]> {
    try {
      const filePath = this.getFilePath(username);
      const content = await this.electronAPI.readFile(filePath);
      if (!content) return [];

      return this.parseNotifications(content);
    } catch (e) {
      console.error('Error loading notifications:', e);
      return [];
    }
  }

  async saveNotifications(username: string, notifications: Notification[]) {
    try {
      await this.ensureDir();
      const filePath = this.getFilePath(username);
      const content = this.serializeNotifications(notifications);
      await this.electronAPI.writeFile(filePath, content);
    } catch (e) {
      console.error('Error saving notifications:', e);
    }
  }

  async processNotifications(notifications: Notification[]) {
    if (!notifications || notifications.length === 0) return;

    // Group by recipient
    const byRecipient = new Map<string, Notification[]>();
    for (const n of notifications) {
      if (!byRecipient.has(n.recipient)) {
        byRecipient.set(n.recipient, []);
      }
      byRecipient.get(n.recipient)!.push(n);
    }

    // Load, merge and save for each recipient
    for (const [recipient, newNotifs] of byRecipient.entries()) {
      const existing = await this.loadNotifications(recipient);
      const merged = [...newNotifs, ...existing];
      // Keep only last 100
      await this.saveNotifications(recipient, merged.slice(0, 100));
    }
  }

  parseNotifications(content: string): Notification[] {
    const notifications: Notification[] = [];
    const items = content.split('\n---\n');

    for (const item of items) {
      if (!item.trim()) continue;

      // Extract frontmatter
      const match = item.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      let yamlData: any = {};
      let body = item;

      if (match) {
        try {
          yamlData = yaml.load(match[1]);
          body = match[2];
        } catch (e) {}
      } else {
        // Just try parsing the whole thing if it's pure yaml
         try {
           yamlData = yaml.load(item);
         } catch(e){}
      }

      if (yamlData && yamlData.id) {
         notifications.push({
           id: yamlData.id,
           type: yamlData.type || 'system',
           title: yamlData.title || 'Notification',
           message: yamlData.message || body.trim(),
           targetId: yamlData.targetId,
           actor: yamlData.actor,
           timestamp: yamlData.timestamp || new Date().toISOString(),
           read: yamlData.read === true,
           recipient: yamlData.recipient // Added recipient field support
         } as any);
      }
    }

    // Sort newest first
    return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  serializeNotifications(notifications: Notification[]): string {
    return notifications.map(n => {
      const { message, ...meta } = n;
      const metaString = yaml.dump(meta).trim();
      return `---
${metaString}
---
${message}`;
    }).join('\n\n---\n\n');
  }
}
