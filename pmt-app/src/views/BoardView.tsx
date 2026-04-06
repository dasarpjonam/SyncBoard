import React, { useState } from 'react';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkItemCard } from '../components/WorkItemCard';
import { WorkItemModal } from '../components/WorkItemModal';
import { WorkItem } from '../types';
import { serializeMarkdownItem } from '../lib/markdown';
import { ITEMS_FOLDER } from '../lib/constants';

export function BoardView() {
  const { items, config, workspacePath, updateItem, addItem } = useWorkspace();
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!workspacePath) {
    return (
      <div className="flex-grow flex items-center justify-center text-gray-500">
        Please open a workspace to get started.
      </div>
    );
  }

  const columns = config.statuses;

  const handleSave = async (item: WorkItem) => {
    const isNew = !items.find(i => i.id === item.id);
    const content = serializeMarkdownItem(item);

    await window.electronAPI.ensureDir(`${workspacePath}/${ITEMS_FOLDER}`);
    await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${item.fileName}`, content);

    if (isNew) {
      addItem(item);
    } else {
      updateItem(item);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex-grow flex flex-col h-full overflow-hidden bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Project Board</h1>
        <button
          onClick={() => { setSelectedItem(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
        >
          New Item
        </button>
      </div>

      <div className="flex-grow flex gap-4 overflow-x-auto pb-4">
        {columns.map(status => (
          <div key={status} className="w-80 flex-shrink-0 flex flex-col bg-gray-200 rounded-lg p-3 max-h-full">
            <h3 className="font-semibold text-gray-700 mb-3 px-1 flex justify-between">
              {status}
              <span className="text-gray-500 text-sm font-normal">
                {items.filter(i => i.status === status).length}
              </span>
            </h3>

            <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-1">
              {items.filter(i => i.status === status).map(item => (
                <WorkItemCard
                  key={item.id}
                  item={item}
                  onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <WorkItemModal
          item={selectedItem}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
