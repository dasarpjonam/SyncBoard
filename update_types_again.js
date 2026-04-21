const fs = require('fs');
const typesPath = 'pmt-app/src/types/index.ts';
let typesContent = fs.readFileSync(typesPath, 'utf8');

// replace the previous Notification interface with one containing recipient
typesContent = typesContent.replace(/export interface Notification \{[\s\S]*?\}/,
`export interface Notification {
  id: string;
  type: 'mention' | 'assignment' | 'status_change' | 'system';
  title: string;
  message: string;
  targetId?: string; // e.g. WorkItem ID
  actor?: string; // The user who triggered it
  recipient: string; // The user who should see this
  timestamp: string;
  read: boolean;
}`);

fs.writeFileSync(typesPath, typesContent);
console.log('Types updated with recipient.');
