import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';

interface EditableCellProps {
  value: string;
  type?: 'text' | 'select';
  options?: string[];
  onSave: (value: string) => Promise<void>;
  className?: string;
  placeholder?: string;
}

export function EditableCell({ 
  value, 
  type = 'text', 
  options = [], 
  onSave, 
  className = '',
  placeholder = ''
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' && inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editValue !== value && !isSaving) {
      setIsSaving(true);
      try {
        await onSave(editValue);
      } catch (error) {
        console.error('Failed to save:', error);
        setEditValue(value); // Revert on error
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (!isEditing) {
    return (
      <div
        onDoubleClick={handleDoubleClick}
        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${className}`}
        title="Double-click to edit"
      >
        {value || <span className="text-gray-400">{placeholder || 'Double-click to edit'}</span>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none ${className}`}
        disabled={isSaving}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none ${className}`}
      disabled={isSaving}
      placeholder={placeholder}
    />
  );
}
