import React, { useState } from 'react';
import { useWorkspace } from '../store/WorkspaceContext';

export function SettingsView() {
  const { config, saveConfig, apiKey, setApiKey } = useWorkspace();
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [typesStr, setTypesStr] = useState(config.types.join(', '));
  const [statusesStr, setStatusesStr] = useState(config.statuses.join(', '));
  const [usersStr, setUsersStr] = useState((config.users || []).join(', '));

  const handleSaveWorkspace = () => {
    saveConfig({
      ...config,
      types: typesStr.split(',').map(s => s.trim()).filter(Boolean),
      statuses: statusesStr.split(',').map(s => s.trim()).filter(Boolean),
      users: usersStr.split(',').map(s => s.trim()).filter(Boolean),
    });
    alert('Workspace settings saved!');
  };

  const handleSaveApi = () => {
    setApiKey(localApiKey);
    alert('API Key saved securely to local storage.');
  };

  return (
    <div className="flex-grow p-8 bg-white overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="max-w-2xl">
        <section className="mb-10">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Workspace Configuration</h2>
          <p className="text-sm text-gray-500 mb-4">These settings are saved to <code>config.yaml</code> in your workspace.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Work Item Types (comma separated)</label>
            <input
              type="text"
              value={typesStr}
              onChange={e => setTypesStr(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Statuses (comma separated)</label>
            <input
              type="text"
              value={statusesStr}
              onChange={e => setStatusesStr(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Users (comma separated)</label>
            <input
              type="text"
              value={usersStr}
              onChange={e => setUsersStr(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <button onClick={handleSaveWorkspace} className="px-4 py-2 bg-gray-800 text-white rounded">
            Save Workspace Settings
          </button>
        </section>

        <section>
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">AI Assistant Settings</h2>
          <p className="text-sm text-gray-500 mb-4">Saved locally on your machine, never synced.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-2 border rounded"
            />
          </div>

          <button onClick={handleSaveApi} className="px-4 py-2 bg-blue-600 text-white rounded">
            Save API Key
          </button>
        </section>
      </div>
    </div>
  );
}
