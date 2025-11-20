import React from 'react';
import { User } from 'lucide-react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { EmptyState } from '@/shared/ui';

export const ProfileSection: React.FC = () => (
    <div className="flex flex-col h-full bg-gray-950">
        <div className="p-6 border-b border-gray-700">
            <div>
                <h2 className="text-lg font-semibold text-gray-100">Profile Settings</h2>
                <p className="text-sm text-gray-400">Manage your account settings</p>
            </div>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <EmptyState
                    icon={<User className="w-12 h-12 text-gray-500" />}
                    message="Profile settings coming soon"
                />
            </div>
        </ScrollArea>
    </div>
);
