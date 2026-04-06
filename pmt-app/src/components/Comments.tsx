import React, { useState, useRef, useEffect } from 'react';
import { Comment } from '../types';
import { useWorkspace } from '../store/WorkspaceContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, AtSign } from 'lucide-react';

interface Props {
  comments: Comment[];
  onAddComment: (comment: Comment) => void;
}

export function Comments({ comments, onAddComment }: Props) {
  const { config } = useWorkspace();
  const [commentText, setCommentText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const users = config.users || [];

  // Detect @mention trigger
  useEffect(() => {
    const text = commentText.slice(0, cursorPosition);
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = text.slice(lastAtIndex + 1);
      // Check if there's a space after @ (which would close the mention)
      if (!afterAt.includes(' ')) {
        setMentionFilter(afterAt);
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
    setMentionFilter('');
  }, [commentText, cursorPosition]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Update cursor position
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        setCursorPosition(textareaRef.current.selectionStart);
      }
    });
  };

  const insertMention = (username: string) => {
    const text = commentText;
    const beforeCursor = text.slice(0, cursorPosition);
    const afterCursor = text.slice(cursorPosition);
    
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    const newText = beforeCursor.slice(0, lastAtIndex) + `@${username} ` + afterCursor;
    
    setCommentText(newText);
    setShowMentions(false);
    setMentionFilter('');
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPosition = lastAtIndex + username.length + 2;
      textareaRef.current?.setSelectionRange(newPosition, newPosition);
      setCursorPosition(newPosition);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    // Extract mentions from comment text
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(commentText)) !== null) {
      if (!mentions.includes(match[1])) {
        mentions.push(match[1]);
      }
    }

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: 'Current User', // TODO: Get from auth context
      content: commentText,
      createdAt: new Date().toISOString(),
      mentions,
    };

    onAddComment(newComment);
    setCommentText('');
  };

  const filteredUsers = users.filter(u =>
    u.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {comments.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>

      {/* Comment Input */}
      <div className="border-t p-4 bg-gray-50">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onClick={() => setCursorPosition(textareaRef.current?.selectionStart || 0)}
              placeholder="Add a comment... (Use @ to mention users)"
              className="w-full p-3 pr-12 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>

          {/* Mention Dropdown */}
          {showMentions && filteredUsers.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 min-w-[200px]">
              {filteredUsers.map(user => (
                <button
                  key={user}
                  type="button"
                  onClick={() => insertMention(user)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-2"
                >
                  <AtSign size={16} className="text-gray-400" />
                  <span>{user}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <AtSign size={12} />
          Type @ to mention users
        </div>
      </div>
    </div>
  );
}

// Individual Comment Component
function CommentItem({ comment }: { comment: Comment }) {
  const renderContent = (content: string) => {
    // Highlight @mentions
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-blue-600 font-medium bg-blue-50 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {comment.author.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{comment.author}</div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-gray-700 whitespace-pre-wrap pl-10">
        {renderContent(comment.content)}
      </div>

      {comment.mentions.length > 0 && (
        <div className="mt-2 pl-10 flex flex-wrap gap-1">
          {comment.mentions.map((user, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1"
            >
              <AtSign size={10} />
              {user}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
