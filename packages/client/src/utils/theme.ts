/**
 * Theme Utility
 *
 * Provides runtime configuration for the application's color palette.
 * Colors are defined as CSS variables in index.css and can be updated dynamically.
 */

export type ColorScale = {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950?: string;
};

export type ThemePalette = {
    primary: ColorScale;
    secondary: ColorScale;
    neutral: ColorScale;
    success: Omit<ColorScale, '950'>;
    warning: Omit<ColorScale, '950'>;
    error: Omit<ColorScale, '950'>;
    info: Omit<ColorScale, '950'>;
};

/**
 * Updates a single color variable
 */
export function setColorVariable(name: string, value: string): void {
    document.documentElement.style.setProperty(name, value);
}

/**
 * Updates an entire color scale (e.g., primary, secondary, etc.)
 */
export function setColorScale(scaleName: string, scale: Partial<ColorScale>): void {
    Object.entries(scale).forEach(([shade, color]) => {
        setColorVariable(`--color-${scaleName}-${shade}`, color);
    });
}

/**
 * Updates the entire theme palette
 */
export function setThemePalette(palette: Partial<ThemePalette>): void {
    Object.entries(palette).forEach(([scaleName, scale]) => {
        setColorScale(scaleName, scale);
    });
}

/**
 * Gets the current value of a color variable
 */
export function getColorVariable(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resets all colors to their default values by removing custom styles
 */
export function resetTheme(): void {
    const root = document.documentElement;
    const allVars = ['primary', 'secondary', 'neutral', 'success', 'warning', 'error', 'info'];

    allVars.forEach((scale) => {
        [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].forEach((shade) => {
            root.style.removeProperty(`--color-${scale}-${shade}`);
        });
    });
}

/**
 * Example preset themes
 */
export const presetThemes = {
    /**
     * Default blue theme (already set in CSS)
     */
    default: {
        primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554',
        },
    },

    /**
     * Purple theme
     */
    purple: {
        primary: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764',
        },
    },

    /**
     * Green theme
     */
    green: {
        primary: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16',
        },
    },

    /**
     * Orange theme
     */
    orange: {
        primary: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
            950: '#431407',
        },
    },

    /**
     * Rose theme
     */
    rose: {
        primary: {
            50: '#fff1f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            300: '#fda4af',
            400: '#fb7185',
            500: '#f43f5e',
            600: '#e11d48',
            700: '#be123c',
            800: '#9f1239',
            900: '#881337',
            950: '#4c0519',
        },
    },
};

/**
 * Apply a preset theme by name
 */
export function applyPresetTheme(themeName: keyof typeof presetThemes): void {
    const theme = presetThemes[themeName];
    if (theme) {
        setThemePalette(theme);
    }
}
