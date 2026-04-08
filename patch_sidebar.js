const fs = require('fs');
const path = 'pmt-app/src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/import \{ Link, useLocation \} from 'react-router-dom';/,
`import { Link, useLocation } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';`);

content = content.replace(/<div className="text-sm font-medium">\{currentUser\}<\/div>/,
`<div className="text-sm font-medium">{currentUser}</div>
        <NotificationCenter />`);

fs.writeFileSync(path, content);
console.log('Sidebar patched to include NotificationCenter');
