import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Settings } from 'lucide-react';
import { settingsPhrases } from '@/pages/settings/lib';

export const SettingsHeader: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center space-x-4">
            <button
                onClick={() => navigate({ to: '/chat' })}
                className="text-gray-400 hover:text-gray-200 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <Settings className="w-5 h-5 text-gray-400" />
            <h1 className="text-xl font-semibold text-gray-100">{settingsPhrases.settings}</h1>
        </div>
    );
};
