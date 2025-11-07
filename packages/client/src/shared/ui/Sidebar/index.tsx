import React from 'react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
    children: React.ReactNode;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
    children,
    isCollapsed = false,
    onToggleCollapse,
    header,
    footer,
    className = '',
}) => (
    <div className={`flex flex-col h-full bg-gray-900 border-r border-gray-700 ${className}`}>
        {header && (
            <div className="border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between p-4">
                    {header}
                    {onToggleCollapse && (
                        <button
                            onClick={onToggleCollapse}
                            className="p-1 text-gray-400 hover:text-gray-200 rounded"
                            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        )}

        <ScrollArea className="flex-1">{children}</ScrollArea>

        {footer && <div className="border-t border-gray-700 flex-shrink-0">{footer}</div>}
    </div>
);
