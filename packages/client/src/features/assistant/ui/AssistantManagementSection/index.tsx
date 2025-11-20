import React from 'react';
import { Bot } from 'lucide-react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { EmptyState, SearchInput } from '@/shared/ui';
import { settingsPhrases } from '@/pages/settings/lib';
import { AssistantCard } from '../AssistantCard';
import { AssistantInfo } from '../AssistantModal';

interface AssistantManagementSectionProps {
    assistants: AssistantInfo[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onCreate: () => void;
    onEdit: (assistant: AssistantInfo, e: React.MouseEvent) => void;
    onViewDetails: (assistant: AssistantInfo, e: React.MouseEvent) => void;
    onSelect: (assistant: AssistantInfo) => void;
}

export const AssistantManagementSection: React.FC<AssistantManagementSectionProps> = ({
    assistants,
    searchQuery,
    onSearchChange,
    onCreate,
    onEdit,
    onViewDetails,
    onSelect,
}) => (
    <div className="flex flex-col h-full bg-gray-950">
        <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">{settingsPhrases.aiAssistants}</h2>
                    <p className="text-sm text-gray-400">{settingsPhrases.manageAssistants}</p>
                </div>
                <button
                    onClick={onCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    {settingsPhrases.createAssistant}
                </button>
            </div>
            <SearchInput
                value={searchQuery}
                onChange={onSearchChange}
                placeholder={settingsPhrases.searchAssistants}
                className="bg-gray-800 border-gray-600 text-gray-100"
            />
        </div>

        <ScrollArea className="flex-1">
            <div className="p-6">
                {assistants.length === 0 ? (
                    <EmptyState
                        icon={<Bot className="w-12 h-12 text-gray-500" />}
                        message={searchQuery ? settingsPhrases.noAssistantsFound : settingsPhrases.noAssistantsYet}
                        actionLabel={!searchQuery ? settingsPhrases.createFirstAssistant : undefined}
                        onAction={!searchQuery ? onCreate : undefined}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {assistants.map((assistant) => (
                            <div key={assistant.id} className="bg-gray-800 rounded-lg border border-gray-700 p-1">
                                <AssistantCard
                                    assistant={assistant}
                                    onSelect={onSelect}
                                    onEdit={onEdit}
                                    onViewDetails={onViewDetails}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ScrollArea>
    </div>
);
