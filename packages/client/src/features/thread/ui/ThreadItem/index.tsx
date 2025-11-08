import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export interface ThreadItemData {
    id: string;
    title: string;
    messages: { id: string; content: string; role: string }[];
    createdAt: string;
    updatedAt: string;
}

interface ThreadItemProps {
    thread: ThreadItemData;
    isActive?: boolean;
    onSelect?: (thread: ThreadItemData) => void;
    onEdit?: (threadId: string, newTitle: string) => void;
    onDelete?: (threadId: string) => void;
}

export const ThreadItem: React.FC<ThreadItemProps> = ({ thread, isActive = false, onSelect, onEdit, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(thread.title);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInDays === 1) {
            return 'Yesterday';
        } else if (diffInDays < 7) {
            return `${diffInDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const handleEditStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditTitle(thread.title);
    };

    const handleEditSave = () => {
        if (editTitle.trim() && onEdit) {
            onEdit(thread.id, editTitle.trim());
        }
        setIsEditing(false);
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditTitle(thread.title);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleEditSave();
        } else if (e.key === 'Escape') {
            handleEditCancel();
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.(thread.id);
    };

    return (
        <div
            className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                isActive ? 'bg-blue-600 border border-blue-500' : 'hover:bg-gray-800 border border-transparent'
            }`}
            onClick={() => onSelect?.(thread)}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={handleKeyPress}
                            className="w-full px-2 py-1 text-sm font-medium bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <h3 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
                            {thread.title}
                        </h3>
                    )}
                    <p className={`text-xs mt-1 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                        {formatDate(thread.updatedAt)}
                    </p>
                    <p className={`text-xs mt-0.5 ${isActive ? 'text-blue-300' : 'text-gray-500'}`}>
                        {thread.messages.length} messages
                    </p>
                </div>
                {(onEdit || onDelete) && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button
                                onClick={handleEditStart}
                                className={`p-1 rounded transition-colors ${
                                    isActive ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                                title="Edit title"
                            >
                                <Edit2 className="w-3 h-3" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={handleDelete}
                                className={`p-1 rounded transition-colors ${
                                    isActive ? 'text-blue-200 hover:text-red-300' : 'text-gray-400 hover:text-red-400'
                                }`}
                                title="Delete thread"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
