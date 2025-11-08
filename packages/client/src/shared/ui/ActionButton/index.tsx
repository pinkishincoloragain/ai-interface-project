import React from 'react';

interface ActionButtonProps {
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
    onClick,
    variant = 'primary',
    disabled = false,
    children,
    className = '',
}) => {
    const baseClasses =
        'px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {children}
        </button>
    );
};
