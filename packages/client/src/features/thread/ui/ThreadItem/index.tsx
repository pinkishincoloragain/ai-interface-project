import React, { useState } from 'react';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SidebarButton } from '@/shared/ui';
import { threadPhrases } from '../../lib';

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

    const handleEditStart = () => {
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

    const handleDelete = () => {
        onDelete?.(thread.id);
    };

    if (isEditing) {
        return (
            <div className="px-2">
                <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleEditSave}
                    onKeyDown={handleKeyPress}
                    className="w-full px-3 py-2 text-sm font-medium bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        );
    }

    const menuButton = (onEdit || onDelete) && (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-gray-400 hover:text-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="min-w-[160px] bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-1 z-50"
                    sideOffset={5}
                    align="end"
                >
                    {onEdit && (
                        <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 rounded cursor-pointer outline-none hover:bg-gray-700 focus:bg-gray-700"
                            onSelect={handleEditStart}
                        >
                            <Edit2 className="w-4 h-4" />
                            {threadPhrases.rename}
                        </DropdownMenu.Item>
                    )}
                    {onDelete && (
                        <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded cursor-pointer outline-none hover:bg-gray-700 focus:bg-gray-700"
                            onSelect={handleDelete}
                        >
                            <Trash2 className="w-4 h-4" />
                            {threadPhrases.delete}
                        </DropdownMenu.Item>
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );

    return (
        <div className="group">
            <SidebarButton
                title={thread.title}
                onClick={() => onSelect?.(thread)}
                isActive={isActive}
                justify="start"
                rightElement={menuButton}
            />
        </div>
    );
};
