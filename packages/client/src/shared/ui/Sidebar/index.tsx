import React from 'react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { PanelLeft, PanelRight } from 'lucide-react';
import { sharedPhrases } from '@/shared/lib';

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
        {/* Collapse button at the top */}
        {onToggleCollapse && (
            <div
                className={`px-2 py-3 flex ${isCollapsed ? 'justify-center' : 'justify-end'} border-b border-gray-700 flex-shrink-0`}
            >
                <button
                    onClick={onToggleCollapse}
                    className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
                    title={isCollapsed ? sharedPhrases.expandSidebar : sharedPhrases.collapseSidebar}
                >
                    {isCollapsed ? <PanelRight className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </button>
            </div>
        )}

        {/* Header section without collapse button */}
        {header && (
            <div className="border-b border-gray-700 flex-shrink-0">
                <div className="px-2 py-4">{header}</div>
            </div>
        )}

        <ScrollArea className="flex-1">{children}</ScrollArea>

        {footer && <div className="border-t border-gray-700 flex-shrink-0">{footer}</div>}
    </div>
);
