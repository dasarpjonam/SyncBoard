import { WorkItem, Notification } from '../types';
import { generateWorkItemId } from './id-generator';

export interface TriggerContext {
  oldItem?: WorkItem;
  newItem: WorkItem;
  currentUser: string | null;
}

export type TriggerHandler = (context: TriggerContext) => Notification[];

export const triggerRegistry: Record<string, TriggerHandler> = {
  statusChange: ({ oldItem, newItem, currentUser }) => {
    const notifications: Notification[] = [];
    if (oldItem && oldItem.status !== newItem.status) {
      // Notify the assignee if someone else changed the status
      if (newItem.assignee && newItem.assignee !== currentUser) {
        notifications.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: 'status_change',
          title: `Status changed on ${newItem.id}`,
          message: `${currentUser || 'Someone'} changed the status of "${newItem.title}" from ${oldItem.status} to ${newItem.status}`,
          targetId: newItem.id,
          actor: currentUser || 'System',
          recipient: newItem.assignee!,
          timestamp: new Date().toISOString(),
          read: false
        });
      }
    }
    return notifications;
  },

  assignment: ({ oldItem, newItem, currentUser }) => {
    const notifications: Notification[] = [];
    if (newItem.assignee && (!oldItem || oldItem.assignee !== newItem.assignee)) {
       // Notify the new assignee if they didn't assign it to themselves
       if (newItem.assignee !== currentUser) {
         notifications.push({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: 'assignment',
            title: `You were assigned to ${newItem.id}`,
            message: `${currentUser || 'Someone'} assigned you to "${newItem.title}"`,
            targetId: newItem.id,
            actor: currentUser || 'System',
          recipient: newItem.assignee!,
          timestamp: new Date().toISOString(),
            read: false
         });
       }
    }
    return notifications;
  },

  mentions: ({ oldItem, newItem, currentUser }) => {
    const notifications: Notification[] = [];

    // Find mentions in comments
    if (newItem.comments) {
      const newComments = oldItem
        ? newItem.comments.filter(c => !oldItem.comments?.find(oc => oc.id === c.id))
        : newItem.comments;

      for (const comment of newComments) {
        // Simple regex to find @mentions
        const mentions = comment.content.match(/@([a-zA-Z0-9_.-]+)/g) || [];
        for (const mention of mentions) {
          const mentionedUser = mention.substring(1); // remove @
          if (mentionedUser !== currentUser) {
            notifications.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              type: 'mention',
              title: `You were mentioned in ${newItem.id}`,
              message: `${comment.author} mentioned you in a comment on "${newItem.title}"`,
              targetId: newItem.id,
              actor: comment.author,
              recipient: mentionedUser,
              timestamp: comment.createdAt,
              read: false
            });
          }
        }
      }
    }

    // Check main content mentions if content changed
    if (!oldItem || oldItem.content !== newItem.content) {
      const mentions: string[] = newItem.content.match(/@([a-zA-Z0-9_.-]+)/g) || [];
      // To be accurate we should only notify on NEW mentions, but for simplicity we'll just check if it's there
      // A more robust implementation would diff the mentions.

      const oldMentions: string[] = oldItem ? (oldItem.content.match(/@([a-zA-Z0-9_.-]+)/g) || []) : [];

      const newUniqueMentions = mentions.filter((m: string) => !oldMentions.includes(m));

      for (const mention of newUniqueMentions) {
        const mentionedUser = mention.substring(1); // remove @
        if (mentionedUser !== currentUser) {
          notifications.push({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: 'mention',
            title: `You were mentioned in ${newItem.id}`,
            message: `${currentUser || 'Someone'} mentioned you in the description of "${newItem.title}"`,
            targetId: newItem.id,
            actor: currentUser || 'System',
          recipient: newItem.assignee!,
          timestamp: new Date().toISOString(),
            read: false
          });
        }
      }
    }

    return notifications;
  }
};

export function evaluateTriggers(context: TriggerContext): Notification[] {
  let allNotifications: Notification[] = [];
  for (const handler of Object.values(triggerRegistry)) {
    allNotifications = [...allNotifications, ...handler(context)];
  }
  return allNotifications;
}
