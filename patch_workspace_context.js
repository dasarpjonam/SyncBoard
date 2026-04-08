const fs = require('fs');
const path = 'pmt-app/src/store/WorkspaceContext.tsx';
let content = fs.readFileSync(path, 'utf8');

// Imports
content = content.replace(/import yaml from 'js-yaml';/,
`import yaml from 'js-yaml';
import { Notification } from '../types';
import { NotificationManager } from '../lib/notification-manager';
import { LiveContextManager } from '../lib/live-context';
import { evaluateTriggers } from '../lib/notification-triggers';`);

// Context props
content = content.replace(/interface WorkspaceContextProps \{/,
`interface WorkspaceContextProps {
  notifications: Notification[];
  unreadCount: number;
  markNotificationsAsRead: () => void;
  markNotificationAsRead: (id: string) => void;`);

// Provider state
content = content.replace(/const \[currentUser, setCurrentUserState\] = useState<string \| null>\(localStorage\.getItem\('currentUser'\)\);/,
`const [currentUser, setCurrentUserState] = useState<string | null>(localStorage.getItem('currentUser'));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Initialize managers lazily when needed
  const getNotificationManager = () => workspacePath ? new NotificationManager(workspacePath, window.electronAPI) : null;
  const getLiveContextManager = () => workspacePath ? new LiveContextManager(workspacePath, window.electronAPI) : null;
`);

// Load notifications when workspace or user changes
content = content.replace(/useEffect\(\(\) => \{\n    setItemsTree\(buildTree\(items\)\);\n  \}, \[items\]\);/,
`useEffect(() => {
    setItemsTree(buildTree(items));
  }, [items]);

  useEffect(() => {
    if (workspacePath && currentUser) {
      const nm = getNotificationManager();
      if (nm) {
        nm.loadNotifications(currentUser).then(setNotifications);
      }
    } else {
      setNotifications([]);
    }
  }, [workspacePath, currentUser]);`);

// Mark read functions
content = content.replace(/const setCurrentUser = \(user: string \| null\) => \{/,
`const markNotificationsAsRead = async () => {
    if (!currentUser || !workspacePath) return;
    const nm = getNotificationManager();
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    if (nm) await nm.saveNotifications(currentUser, updated);
  };

  const markNotificationAsRead = async (id: string) => {
    if (!currentUser || !workspacePath) return;
    const nm = getNotificationManager();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    if (nm) await nm.saveNotifications(currentUser, updated);
  };

  const setCurrentUser = (user: string | null) => {`);

// Update triggers in addItem
content = content.replace(/const addItem = \(item: WorkItem, parentId\?: string\) => \{/,
`const addItem = async (item: WorkItem, parentId?: string) => {`);
content = content.replace(/setItems\(prev => \[\.\.\.prev, newItem\]\);\n  \};/,
`setItems(prev => {
      const newItems = [...prev, newItem];

      // Async trigger and live context updates
      setTimeout(async () => {
        const triggers = evaluateTriggers({ newItem, currentUser });
        if (triggers.length > 0) {
          const nm = getNotificationManager();
          if (nm) {
            await nm.processNotifications(triggers);
            if (currentUser) {
              const notifs = await nm.loadNotifications(currentUser);
              setNotifications(notifs);
            }
          }
        }

        const lcm = getLiveContextManager();
        if (lcm) await lcm.updateLiveContext(newItems, config);
      }, 0);

      return newItems;
    });
  };`);

// Update triggers in updateItem
content = content.replace(/const updateItem = \(item: WorkItem\) => setItems\(prev => prev\.map\(i => i\.id === item\.id \? item : i\)\);/,
`const updateItem = (item: WorkItem) => {
    setItems(prev => {
      const oldItem = prev.find(i => i.id === item.id);
      const newItems = prev.map(i => i.id === item.id ? item : i);

      if (oldItem) {
        setTimeout(async () => {
          const triggers = evaluateTriggers({ oldItem, newItem: item, currentUser });
          if (triggers.length > 0) {
            const nm = getNotificationManager();
            if (nm) {
              await nm.processNotifications(triggers);
              if (currentUser) {
                const notifs = await nm.loadNotifications(currentUser);
                setNotifications(notifs);
              }
            }
          }

          const lcm = getLiveContextManager();
          if (lcm) await lcm.updateLiveContext(newItems, config);
        }, 0);
      }
      return newItems;
    });
  };`);

// Return provider
content = content.replace(/<WorkspaceContext\.Provider value=\{\{/,
`<WorkspaceContext.Provider value={{
      notifications, unreadCount, markNotificationsAsRead, markNotificationAsRead,`);

fs.writeFileSync(path, content);
console.log('WorkspaceContext patched');
