import React, { useState } from 'react';
import { useWorkspace } from '../store/WorkspaceContext';
import { ListEditor } from '../components/ListEditor';
import { DEFAULT_CONFIG } from '../store/WorkspaceContext';
import { CheckCircle2 } from 'lucide-react';

export function SetupView() {
  const { workspacePath, completeSetup } = useWorkspace();
  const [types, setTypes] = useState<string[]>(DEFAULT_CONFIG.types);
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_CONFIG.statuses);
  const [users, setUsers] = useState<string[]>(DEFAULT_CONFIG.users || []);

  const handleComplete = () => {
    completeSetup({
      types,
      statuses,
      users,
    });
  };

  return (
    <div className="flex-grow flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-2xl w-full border border-gray-100">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup New Workspace</h1>
          <p className="text-gray-500 text-sm">
            Configure your workspace settings for <strong>{workspacePath?.split(/[/\\]/).pop()}</strong>.<br/>
            This will generate a <code>config.yaml</code> file in the folder.
          </p>
        </div>

        <div className="space-y-6">
          <ListEditor
            label="Work Item Types"
            items={types}
            onChange={setTypes}
            placeholder="e.g. Milestone"
          />
          <ListEditor
            label="Statuses (Workflow stages)"
            items={statuses}
            onChange={setStatuses}
            placeholder="e.g. Blocked"
          />
          <ListEditor
            label="Workspace Users"
            items={users}
            onChange={setUsers}
            placeholder="e.g. Alice"
          />
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleComplete}
            disabled={types.length === 0 || statuses.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
