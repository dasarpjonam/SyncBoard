import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../store/WorkspaceContext';
import { Plus, X } from 'lucide-react';

export function SettingsView() {
  const { config, saveConfig, apiKey, setApiKey } = useWorkspace();
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');

  const [types, setTypes] = useState<string[]>([...config.types]);
  const [newType, setNewType] = useState('');

  const [statusesStr, setStatusesStr] = useState(config.statuses.join(', '));
  const [usersStr, setUsersStr] = useState((config.users || []).join(', '));

  useEffect(() => {
    setTypes([...config.types]);
    setStatusesStr(config.statuses.join(', '));
    setUsersStr((config.users || []).join(', '));
  }, [config]);

  const handleAddType = () => {
    if (newType.trim() && !types.includes(newType.trim())) {
      setTypes([...types, newType.trim()]);
      setNewType('');
    }
  };

  const handleRemoveType = (typeToRemove: string) => {
    setTypes(types.filter(t => t !== typeToRemove));
  };

  const handleSaveWorkspace = () => {
    saveConfig({
      ...config,
      types,
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

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Work Item Types</label>
            <div className="flex flex-col gap-2 mb-2">
              {types.map((type, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                  <span>{type}</span>
                  <button onClick={() => handleRemoveType(type)} className="text-red-500 hover:text-red-700">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newType}
                onChange={e => setNewType(e.target.value)}
                placeholder="Add new type..."
                className="flex-grow p-2 border rounded"
                onKeyDown={e => e.key === 'Enter' && handleAddType()}
              />
              <button onClick={handleAddType} className="p-2 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center">
                <Plus size={20} />
              </button>
            </div>
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
            <label className="block text-sm font-medium mb-1">Google Gemini API Key</label>
            <input
              type="password"
              value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              placeholder="AIza..."
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
