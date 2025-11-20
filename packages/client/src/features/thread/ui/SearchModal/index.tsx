import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, X, MessageSquare } from 'lucide-react';
import type { ThreadItemData } from '../ThreadItem';
import { threadPhrases } from '../../lib';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    threads: ThreadItemData[];
    onThreadSelect?: (thread: ThreadItemData) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, threads, onThreadSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedItemRef = useRef<HTMLButtonElement>(null);

    // Filter threads based on search query
    const filteredThreads = threads.filter((thread) => thread.title.toLowerCase().includes(searchQuery.toLowerCase()));

    // Reset selected index when search query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedItemRef.current) {
            selectedItemRef.current.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [selectedIndex]);

    const handleThreadClick = (thread: ThreadItemData) => {
        onThreadSelect?.(thread);
        onClose();
        setSearchQuery('');
    };

    const handleClose = () => {
        onClose();
        setSearchQuery('');
        setSelectedIndex(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (filteredThreads.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % filteredThreads.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filteredThreads.length) % filteredThreads.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredThreads[selectedIndex]) {
                    handleThreadClick(filteredThreads[selectedIndex]);
                }
                break;
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden z-50 border border-gray-700">
                    <div className="flex flex-col h-full max-h-[80vh]">
                        {/* Header with Search Input */}
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center gap-3">
                                <Search className="w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={threadPhrases.searchPlaceholder}
                                    className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 outline-none text-lg"
                                    autoFocus
                                />
                                <Dialog.Close asChild>
                                    <button className="p-1 text-gray-400 hover:text-gray-200 rounded-lg">
                                        <X className="w-5 h-5" />
                                    </button>
                                </Dialog.Close>
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {searchQuery === '' ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <Search className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="text-sm">{threadPhrases.startTypingToSearch}</p>
                                </div>
                            ) : filteredThreads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="text-sm">{threadPhrases.noChatsFound}</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredThreads.map((thread, index) => (
                                        <button
                                            key={thread.id}
                                            ref={index === selectedIndex ? selectedItemRef : null}
                                            onClick={() => handleThreadClick(thread)}
                                            className={`w-full p-3 text-left text-gray-200 rounded-lg transition-colors group ${
                                                index === selectedIndex
                                                    ? 'bg-gray-800 ring-2 ring-blue-500'
                                                    : 'hover:bg-gray-800'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{thread.title}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {new Date(thread.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
