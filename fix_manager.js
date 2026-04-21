const fs = require('fs');
const path = 'pmt-app/src/lib/notification-manager.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/async addNotifications\(notifications: Notification\[\]\) \{[\s\S]*?\}\n/m,
`async processNotifications(notifications: Notification[]) {
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
`);

fs.writeFileSync(path, content);
console.log('Manager fixed to process addNotifications');
