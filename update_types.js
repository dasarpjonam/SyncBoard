const fs = require('fs');

const typesPath = 'pmt-app/src/types/index.ts';
let typesContent = fs.readFileSync(typesPath, 'utf8');

const newTypes = `
export interface Notification {
  id: string;
  type: 'mention' | 'assignment' | 'status_change' | 'system';
  title: string;
  message: string;
  targetId?: string; // e.g. WorkItem ID
  actor?: string; // The user who triggered it
  timestamp: string;
  read: boolean;
}
`;

if (!typesContent.includes('export interface Notification')) {
  fs.writeFileSync(typesPath, typesContent + '\n' + newTypes);
  console.log('Types updated.');
} else {
  console.log('Types already updated.');
}
