import React, { useState, useRef, useEffect } from 'react';
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
    const [showFade, setShowFade] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Check if content is scrollable
    useEffect(() => {
        const checkScroll = () => {
            const container = scrollContainerRef.current;
            if (container) {
                const hasScroll = container.scrollHeight > container.clientHeight;
                const isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;
                setShowFade(hasScroll && !isAtBottom);
            }
        };

        checkScroll();
        const container = scrollContainerRef.current;
        container?.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        return () => {
            container?.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [children]);

    return (
        <div
            className={`flex flex-col h-full bg-gray-900 border-r border-gray-700 ${className}`}
            onMouseEnter={() => isCollapsed && setIsHovered(true)}
            onMouseLeave={() => isCollapsed && setIsHovered(false)}
        >
            {/* Collapse button at the top */}
            {onToggleCollapse && (
                <div
                    className={`py-3 flex items-center border-b border-gray-700 flex-shrink-0 ${
                        isCollapsed ? 'px-2 justify-center' : 'pr-2 pl-4 justify-between'
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

            {/* Scrollable content area with fade effect */}
            <div className="flex-1 relative overflow-hidden">
                <div
                    ref={scrollContainerRef}
                    className="h-full overflow-y-auto overflow-x-hidden"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#4B5563 transparent',
                    }}
                >
                    {children}
                </div>
                {/* Fade overlay at the bottom */}
                {showFade && (
                    <div
                        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none transition-opacity duration-300"
                        style={{
                            background: 'linear-gradient(to bottom, transparent, rgb(17, 24, 39) 90%)',
                        }}
                    />
                )}
            </div>

            {footer && <div className="border-t border-gray-700 flex-shrink-0">{footer}</div>}
        </div>
    );
};
