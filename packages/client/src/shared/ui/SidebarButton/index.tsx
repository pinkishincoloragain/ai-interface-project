import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SidebarButtonProps {
    icon?: LucideIcon;
    title: string;
    onClick?: () => void;
    className?: string;
    isActive?: boolean;
    rightElement?: React.ReactNode;
    justify?: 'center' | 'start';
    shortcut?: string;
}

export const SidebarButton: React.FC<SidebarButtonProps> = ({
    icon: Icon,
    title,
    onClick,
    className = '',
    isActive = false,
    rightElement,
    justify = 'center',
    shortcut,
}) => {
    const justifyClass = justify === 'center' ? 'justify-center' : 'justify-start';
    const bgClass = isActive ? 'bg-gray-800' : 'bg-transparent hover:bg-gray-800';

    return (
        <button
            onClick={onClick}
            className={`group w-full px-3 py-2.5 ${bgClass} text-gray-200 text-sm rounded-lg transition-colors flex items-center ${justifyClass} gap-2 ${className}`}
            title={title}
        >
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1 text-left truncate">{title}</span>
            {shortcut && (
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-1.5 py-0.5 text-xs font-semibold text-gray-400 bg-gray-800">{shortcut}</div>
                </div>
            )}
            {rightElement && <div className="flex-shrink-0">{rightElement}</div>}
        </button>
    );
};
