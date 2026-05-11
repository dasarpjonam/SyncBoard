import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkItemCard } from './WorkItemCard';
import { WorkItem } from '../types';
import { getAllItems } from '../lib/hierarchy';
import { Plus } from 'lucide-react';
import { serializeMarkdownItem } from '../lib/markdown';
import { ITEMS_FOLDER } from '../lib/constants';

interface Props {
  itemsTree: WorkItem[];
  onEditItem: (item: WorkItem) => void;
  onNewItem: (parentId?: string) => void;
}

export function BoardSection({ itemsTree, onEditItem, onNewItem }: Props) {
  const { config, workspacePath, updateItem } = useWorkspace();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  if (!workspacePath) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Please open a workspace to get started.
      </div>
    );
  }

  // Flatten tree to get all items for board display
  const allItems = getAllItems(itemsTree);
  const columns = config.statuses;

  // Show empty state if no items exist
  if (allItems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Work Items Yet</h2>
          <p className="text-gray-600 mb-6">
            Get started by creating your first work item. Organize your tasks, features, and bugs in a visual kanban board.
          </p>
          <button
            onClick={() => onNewItem()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Create First Item
          </button>
        </div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const itemId = active.id as string;
    const newStatus = over.id as string;

    const item = allItems.find(i => i.id === itemId);
    if (!item || item.status === newStatus) return;

    // Update item status
    const updatedItem = {
      ...item,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    // Save to file system
    try {
      const markdown = serializeMarkdownItem(updatedItem);
      await window.electronAPI.ensureDir(`${workspacePath}/${ITEMS_FOLDER}`);
      await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${item.fileName}`, markdown);
      updateItem(updatedItem);
    } catch (error) {
      console.error('Failed to update item status:', error);
    }
  };

  const activeItem = activeId ? allItems.find(i => i.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-gray-100 p-3 md:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-6">
          <button
            onClick={() => onNewItem()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm text-sm md:text-base"
          >
            <Plus size={18} />
            New Item
          </button>
        </div>

        <div className="flex-1 flex gap-3 md:gap-4 overflow-x-auto pb-4">
          {columns.map(status => {
            const statusItems = allItems.filter(i => i.status === status);
            
            return (
              <DroppableColumn key={status} id={status} title={status} count={statusItems.length}>
                {statusItems.map(item => (
                  <DraggableWorkItem key={item.id} item={item} onEdit={onEditItem} />
                ))}
              </DroppableColumn>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeItem && (
          <div className="opacity-80 cursor-grabbing">
            <WorkItemCard item={activeItem} onClick={() => {}} showHierarchy={true} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}

function DroppableColumn({ id, title, count, children }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="min-w-[280px] sm:min-w-[320px] w-full sm:w-80 flex-shrink-0 flex flex-col bg-gray-200 rounded-lg p-3 max-h-full"
    >
      <h3 className="font-semibold text-gray-700 mb-3 px-1 flex justify-between items-center">
        <span>{title}</span>
        <span className="text-gray-500 text-sm font-normal">{count}</span>
      </h3>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {React.Children.count(children) > 0 ? (
          children
        ) : (
          <div className="text-center text-gray-400 text-sm py-4">No items</div>
        )}
      </div>
    </div>
  );
}

// Draggable Work Item Component
interface DraggableWorkItemProps {
  item: WorkItem;
  onEdit: (item: WorkItem) => void;
}

function DraggableWorkItem({ item, onEdit }: DraggableWorkItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}
    >
      <WorkItemCard item={item} onClick={() => onEdit(item)} showHierarchy={true} />
    </div>
  );
}
