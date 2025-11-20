import React from 'react';
import { Bot, LogOut, Sparkles, User } from 'lucide-react';
import { settingsPhrases } from '@/pages/settings/lib';

type SettingsSection = 'assistants' | 'model' | 'profile';

interface SettingsSidebarProps {
    activeSection: SettingsSection;
    onSectionChange: (section: SettingsSection) => void;
    onSignOut: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeSection, onSectionChange, onSignOut }) => (
    <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-4 flex-1">
            <nav className="space-y-2">
                <button
                    onClick={() => onSectionChange('model')}
                    className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg w-full text-left transition-colors ${
                        activeSection === 'model'
                            ? 'text-blue-400 bg-blue-500/10'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    <span>GPT Model</span>
                </button>
                <button
                    onClick={() => onSectionChange('assistants')}
                    className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg w-full text-left transition-colors ${
                        activeSection === 'assistants'
                            ? 'text-blue-400 bg-blue-500/10'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                    }`}
                >
                    <Bot className="w-4 h-4" />
                    <span>{settingsPhrases.assistants}</span>
                </button>
                <button
                    onClick={() => onSectionChange('profile')}
                    className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg w-full text-left transition-colors ${
                        activeSection === 'profile'
                            ? 'text-blue-400 bg-blue-500/10'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                    }`}
                >
                    <User className="w-4 h-4" />
                    <span>{settingsPhrases.profile}</span>
                </button>
            </nav>
        </div>
        <div className="p-4 border-t border-gray-700">
            <button
                onClick={onSignOut}
                className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer w-full transition-colors"
            >
                <LogOut className="w-4 h-4" />
                <span>{settingsPhrases.signOut}</span>
            </button>
        </div>
    </div>
);

export type { SettingsSection };
