const fs = require('fs');
const path = 'pmt-app/src/lib/notification-triggers.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/actor: currentUser \|\| 'System',\n\s*timestamp:/g,
`actor: currentUser || 'System',
          recipient: newItem.assignee!,
          timestamp:`);

content = content.replace(/actor: currentUser \|\| 'System',\n\s*timestamp:/g,
`actor: currentUser || 'System',
            recipient: newItem.assignee!,
            timestamp:`);

content = content.replace(/actor: comment\.author,\n\s*timestamp:/g,
`actor: comment.author,
              recipient: mentionedUser,
              timestamp:`);

content = content.replace(/actor: currentUser \|\| 'System',\n\s*timestamp:/g,
`actor: currentUser || 'System',
            recipient: mentionedUser,
            timestamp:`);

fs.writeFileSync(path, content);
console.log('Triggers fixed to include recipient');
