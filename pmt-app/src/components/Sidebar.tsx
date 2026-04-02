import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, FolderOpen } from 'lucide-react';
import { useWorkspace } from '../store/WorkspaceContext';

export function Sidebar() {
  const { workspacePath, loadWorkspace } = useWorkspace();

  const handleOpenWorkspace = async () => {
    const path = await window.electronAPI.openDirectory();
    if (path) {
      await loadWorkspace(path);
    }
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 text-xl font-bold border-b border-gray-800">
        PM Tool
      </div>

      <div className="p-4 flex flex-col gap-2 flex-grow">
        <NavLink
          to="/"
          className={({isActive}) => `flex items-center gap-2 p-2 rounded hover:bg-gray-800 ${isActive ? 'bg-gray-800' : ''}`}
        >
          <LayoutDashboard size={20} />
          Board
        </NavLink>

        <NavLink
          to="/settings"
          className={({isActive}) => `flex items-center gap-2 p-2 rounded hover:bg-gray-800 ${isActive ? 'bg-gray-800' : ''}`}
        >
          <Settings size={20} />
          Settings
        </NavLink>
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleOpenWorkspace}
          className="flex items-center gap-2 p-2 w-full rounded hover:bg-gray-800 text-left text-sm"
        >
          <FolderOpen size={20} />
          {workspacePath ? 'Change Workspace' : 'Open Workspace'}
        </button>
        {workspacePath && (
          <div className="mt-2 text-xs text-gray-400 truncate px-2" title={workspacePath}>
            {workspacePath.split('/').pop() || workspacePath.split('\\').pop()}
          </div>
        )}
      </div>
    </div>
  );
}
