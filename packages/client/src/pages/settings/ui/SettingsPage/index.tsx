import React, { useState } from 'react';
import { type AssistantInfo, AssistantManagementSection, AssistantModal } from '@/features/assistant';
import { ModelSelectionSection } from '@/features/model-selection';
import { ProfileSection } from '@/features/profile';
import { SettingsHeader, type SettingsSection, SettingsSidebar } from '@/widgets';
import { useAuth } from '@/features/auth';

export const SettingsPage: React.FC = () => {
    const { signOut } = useAuth();
    const [activeSection, setActiveSection] = useState<SettingsSection>('model');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        mode: 'view' | 'edit' | 'create';
        assistant?: AssistantInfo;
    }>({
        isOpen: false,
        mode: 'view',
    });

    // Mock data - in a real app, this would come from a store/API
    const [assistants, setAssistants] = useState<AssistantInfo[]>([
        {
            id: '1',
            name: 'General Assistant',
            description: 'A helpful general-purpose AI assistant',
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 2048,
            systemPrompt: 'You are a helpful AI assistant.',
        },
        {
            id: '2',
            name: 'Code Helper',
            description: 'Specialized in programming and software development',
            model: 'gpt-4',
            temperature: 0.3,
            maxTokens: 4096,
            systemPrompt:
                'You are an expert programming assistant. Help with code, debugging, and software architecture.',
        },
    ]);

    const filteredAssistants = assistants.filter(
        (assistant) =>
            assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            assistant.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateClick = () => {
        setModalState({
            isOpen: true,
            mode: 'create',
            assistant: undefined,
        });
    };

    const handleEditClick = (assistant: AssistantInfo, e: React.MouseEvent) => {
        e.stopPropagation();
        setModalState({
            isOpen: true,
            mode: 'edit',
            assistant,
        });
    };

    const handleViewDetails = (assistant: AssistantInfo, e: React.MouseEvent) => {
        e.stopPropagation();
        setModalState({
            isOpen: true,
            mode: 'view',
            assistant,
        });
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            mode: 'view',
        });
    };

    const handleModalSave = (assistant: AssistantInfo) => {
        if (modalState.mode === 'edit') {
            setAssistants((prev) => prev.map((a) => (a.id === assistant.id ? assistant : a)));
        } else if (modalState.mode === 'create') {
            const newAssistant = {
                ...assistant,
                id: Date.now().toString(),
            };
            setAssistants((prev) => [...prev, newAssistant]);
        }
    };

    const handleAssistantSelect = (assistant: AssistantInfo) => {
        // Handle assistant selection logic here
        // eslint-disable-next-line no-console
        console.log('Selected assistant:', assistant);
    };

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <div className="h-screen bg-gray-950 flex overflow-hidden">
            <div className="flex-1 flex flex-col">
                <SettingsHeader />

                <div className="flex-1 flex">
                    <SettingsSidebar
                        activeSection={activeSection}
                        onSectionChange={setActiveSection}
                        onSignOut={handleSignOut}
                    />

                    <div className="flex-1 flex flex-col">
                        {activeSection === 'model' && <ModelSelectionSection />}

                        {activeSection === 'assistants' && (
                            <AssistantManagementSection
                                assistants={filteredAssistants}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                onCreate={handleCreateClick}
                                onEdit={handleEditClick}
                                onViewDetails={handleViewDetails}
                                onSelect={handleAssistantSelect}
                            />
                        )}

                        {activeSection === 'profile' && <ProfileSection />}
                    </div>
                </div>
            </div>

            <AssistantModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                assistant={modalState.assistant}
                mode={modalState.mode}
                onSave={handleModalSave}
            />
        </div>
    );
};
