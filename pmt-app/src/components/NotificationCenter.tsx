import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../store/WorkspaceContext';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markNotificationsAsRead, markNotificationAsRead } = useWorkspace();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'mention': return 'alternate_email';
      case 'assignment': return 'assignment_ind';
      case 'status_change': return 'rocket_launch';
      default: return 'notifications';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'mention': return 'bg-blue-600';
      case 'assignment': return 'bg-orange-600';
      case 'status_change': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(timestamp).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (Math.abs(daysDifference) > 0) {
       return rtf.format(daysDifference, 'day');
    }

    const hoursDifference = Math.round((new Date(timestamp).getTime() - Date.now()) / (1000 * 60 * 60));
    if (Math.abs(hoursDifference) > 0) {
       return rtf.format(hoursDifference, 'hour');
    }

    const minutesDifference = Math.round((new Date(timestamp).getTime() - Date.now()) / (1000 * 60));
    return rtf.format(minutesDifference, 'minute');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-all text-gray-600 relative"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 border-2 border-white rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[400px] bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(19,27,46,0.08)] border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markNotificationsAsRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markNotificationAsRead(notif.id)}
                  className={`group px-6 py-5 hover:bg-gray-50 transition-all flex gap-4 relative cursor-pointer ${notif.read ? 'opacity-75' : ''}`}
                >
                  {!notif.read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  )}

                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold uppercase">
                      {notif.actor ? notif.actor.substring(0, 2) : 'SY'}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 ${getColor(notif.type)} text-white w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white`}>
                      <span className="material-symbols-outlined text-[12px]">{getIcon(notif.type)}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${notif.read ? 'text-gray-600' : 'text-gray-900'}`}>
                      <span className="font-bold">{notif.actor || 'System'}</span>{' '}
                      {notif.message.replace(notif.actor || 'System', '').trim()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatRelativeTime(notif.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-3 bg-gray-50 text-center border-t border-gray-100">
             <span className="text-xs text-gray-500 font-medium">Activity Stream</span>
          </div>
        </div>
      )}
    </div>
  );
}
