import { useMemo } from 'react';

export type Platform = 'mac' | 'windows' | 'linux' | 'other';

export interface PlatformInfo {
    platform: Platform;
    isMac: boolean;
    modifierKey: string;
    modifierSymbol: string;
}

export const usePlatform = (): PlatformInfo =>
    useMemo(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform?.toLowerCase() || '';

        let detectedPlatform: Platform = 'other';

        if (platform.includes('mac') || userAgent.includes('mac')) {
            detectedPlatform = 'mac';
        } else if (platform.includes('win') || userAgent.includes('win')) {
            detectedPlatform = 'windows';
        } else if (platform.includes('linux') || userAgent.includes('linux')) {
            detectedPlatform = 'linux';
        }

        const isMac = detectedPlatform === 'mac';

        return {
            platform: detectedPlatform,
            isMac,
            modifierKey: isMac ? 'Meta' : 'Control',
            modifierSymbol: isMac ? '⌘' : 'Ctrl',
        };
    }, []);
