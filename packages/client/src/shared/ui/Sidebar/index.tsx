import React, { useState } from 'react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { PanelLeft, PanelRight } from 'lucide-react';
import { sharedPhrases } from '@/shared/lib';
import logo from '@/assets/logo.png';

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
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`flex flex-col h-full bg-gray-900 border-r border-gray-700 ${className}`}
            onMouseEnter={() => isCollapsed && setIsHovered(true)}
            onMouseLeave={() => isCollapsed && setIsHovered(false)}
        >
            {/* Collapse button at the top */}
            {onToggleCollapse && (
                <div
                    className={`px-2 py-3 flex items-center border-b border-gray-700 flex-shrink-0 ${
                        isCollapsed ? 'justify-center' : 'justify-between'
                    }`}
                >
                    {/* Logo - shown when expanded or collapsed */}
                    {isCollapsed ? (
                        <button
                            onClick={onToggleCollapse}
                            className="relative w-8 h-8 flex items-center justify-center cursor-pointer"
                            title={sharedPhrases.expandSidebar}
                        >
                            {/* Logo */}
                            <img
                                src={logo}
                                alt="Logo"
                                className={`absolute w-6 h-6 object-contain transition-opacity duration-300 ${
                                    isHovered ? 'opacity-0' : 'opacity-100'
                                }`}
                            />
                            {/* Expand icon - fades in on hover */}
                            <PanelRight
                                className={`absolute w-4 h-4 text-gray-400 transition-opacity duration-300 ${
                                    isHovered ? 'opacity-100' : 'opacity-0'
                                }`}
                            />
                        </button>
                    ) : (
                        <>
                            <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
                            <button
                                onClick={onToggleCollapse}
                                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
                                title={sharedPhrases.collapseSidebar}
                            >
                                <PanelLeft className="w-4 h-4" />
                            </button>
                        </>
                    )}
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
};
