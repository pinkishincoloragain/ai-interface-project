# Color System Documentation

## Overview

The application uses a fully customizable color system built with Tailwind CSS and CSS variables. This allows for runtime theme switching and complete control over the application's color palette.

## Color Categories

### Primary Colors

Used for main brand elements, primary buttons, and key UI components.

- Accessible via: `primary-*`, `blue-*` (alias)
- Example: `bg-primary-500`, `text-blue-600`

### Secondary Colors

Used for accent elements and secondary actions.

- Accessible via: `secondary-*`, `indigo-*` (alias)
- Example: `bg-secondary-400`, `border-indigo-300`

### Neutral Colors

Used for backgrounds, text, borders, and other neutral UI elements.

- Accessible via: `neutral-*`, `gray-*` (alias)
- Example: `bg-neutral-900`, `text-gray-100`

### Semantic Colors

#### Success

Used for success states, confirmations, and positive feedback.

- Accessible via: `success-*`, `green-*` (alias)
- Example: `bg-success-500`, `text-green-600`

#### Warning

Used for warning states and caution indicators.

- Accessible via: `warning-*`, `yellow-*` (alias)
- Example: `bg-warning-400`, `text-yellow-700`

#### Error

Used for error states, validation failures, and destructive actions.

- Accessible via: `error-*`, `red-*` (alias)
- Example: `bg-error-500`, `text-red-600`

#### Info

Used for informational messages and neutral notifications.

- Accessible via: `info-*`
- Example: `bg-info-400`, `text-info-700`

## Color Scales

Each color category includes a scale from 50 (lightest) to 900/950 (darkest):

- `50`: Lightest shade
- `100-400`: Light to medium-light shades
- `500`: Base/default shade
- `600-800`: Medium-dark to dark shades
- `900-950`: Darkest shades

## Using Colors in Components

### Standard Tailwind Usage

```tsx
// Backgrounds
<div className="bg-primary-500">Primary background</div>
<div className="bg-neutral-900">Dark background</div>

// Text
<p className="text-primary-600">Primary text</p>
<p className="text-error-500">Error text</p>

// Borders
<div className="border-2 border-secondary-400">Bordered box</div>

// Gradients
<div className="bg-gradient-to-r from-primary-500 to-secondary-500">
  Gradient background
</div>
```

### Backwards Compatibility

The system maintains aliases for commonly used colors:

- `blue-*` → `primary-*`
- `indigo-*` → `secondary-*`
- `gray-*` → `neutral-*`
- `green-*` → `success-*`
- `yellow-*` → `warning-*`
- `red-*` → `error-*`

This ensures existing components continue to work without modification.

## Runtime Theme Customization

### Importing the Theme Utility

```typescript
import {
    setColorVariable,
    setColorScale,
    setThemePalette,
    applyPresetTheme,
    presetThemes,
    resetTheme,
} from '@/utils/theme';
```

### Setting Individual Colors

```typescript
// Update a single color
setColorVariable('--color-primary-500', '#ff6b6b');
```

### Setting an Entire Color Scale

```typescript
// Update all shades of primary
setColorScale('primary', {
    50: '#fff5f5',
    100: '#ffe0e0',
    200: '#ffc7c7',
    300: '#ffa3a3',
    400: '#ff7575',
    500: '#ff4747',
    600: '#db2c2c',
    700: '#b81d1d',
    800: '#941515',
    900: '#7a1212',
    950: '#4a0707',
});
```

### Setting Multiple Color Scales

```typescript
// Update primary and secondary at once
setThemePalette({
    primary: {
        500: '#ff6b6b',
        600: '#ee5a5a',
        // ... other shades
    },
    secondary: {
        500: '#51cf66',
        600: '#40c057',
        // ... other shades
    },
});
```

### Using Preset Themes

```typescript
// Apply a built-in theme
applyPresetTheme('purple'); // Switch to purple theme
applyPresetTheme('green'); // Switch to green theme
applyPresetTheme('orange'); // Switch to orange theme
applyPresetTheme('rose'); // Switch to rose theme
applyPresetTheme('default'); // Back to default blue

// Available presets: 'default', 'purple', 'green', 'orange', 'rose'
```

### Resetting to Default

```typescript
// Remove all custom colors and revert to CSS defaults
resetTheme();
```

## Creating Custom Themes

### Define Your Theme

```typescript
const customTheme = {
    primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
        950: '#082f49',
    },
    secondary: {
        50: '#fdf4ff',
        100: '#fae8ff',
        200: '#f5d0fe',
        300: '#f0abfc',
        400: '#e879f9',
        500: '#d946ef',
        600: '#c026d3',
        700: '#a21caf',
        800: '#86198f',
        900: '#701a75',
        950: '#4a044e',
    },
};

setThemePalette(customTheme);
```

### Persisting Theme Selection

```typescript
// Save theme preference
function saveTheme(themeName: string) {
    localStorage.setItem('theme', themeName);
    applyPresetTheme(themeName as keyof typeof presetThemes);
}

// Load theme on app startup
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && savedTheme in presetThemes) {
        applyPresetTheme(savedTheme as keyof typeof presetThemes);
    }
}
```

## CSS Variable Reference

All colors are defined as CSS variables in the `:root` element:

```css
:root {
    /* Primary Colors */
    --color-primary-50: #eff6ff;
    --color-primary-100: #dbeafe;
    /* ... */
    --color-primary-950: #172554;

    /* Secondary Colors */
    --color-secondary-50: #eef2ff;
    /* ... */

    /* Neutral Colors */
    --color-neutral-50: #f9fafb;
    /* ... */

    /* Semantic Colors */
    --color-success-50: #f0fdf4;
    --color-warning-50: #fffbeb;
    --color-error-50: #fef2f2;
    --color-info-50: #ecfeff;
    /* ... */
}
```

## Best Practices

1. **Use Semantic Names**: Prefer `primary-*`, `secondary-*`, `success-*`, etc. over color names like `blue-*` for better maintainability.

2. **Consistent Shades**: Use the same shade numbers across different colors for visual consistency:

    - `500`: Base color for most use cases
    - `600-700`: Hover states
    - `100-200`: Light backgrounds
    - `800-900`: Dark backgrounds

3. **Accessibility**: Ensure sufficient contrast between text and background colors. Generally:

    - Light backgrounds (50-200) → Dark text (700-900)
    - Dark backgrounds (700-950) → Light text (50-200)

4. **Theme Switching**: When implementing theme switchers, test all component states to ensure readability and usability across themes.

5. **Performance**: Color variable updates are performant, but avoid frequent theme switching during critical user interactions.

## Migration Guide

### For Existing Components

No changes required! The system maintains backward compatibility:

```tsx
// These all continue to work
<div className="bg-blue-500">Still works</div>
<div className="bg-gray-900">Still works</div>
<div className="text-red-600">Still works</div>
```

### For New Components

Prefer semantic color names:

```tsx
// Recommended
<div className="bg-primary-500">New way</div>
<div className="bg-neutral-900">New way</div>
<div className="text-error-600">New way</div>
```

## Examples

### Theme Switcher Component

```tsx
import { applyPresetTheme, presetThemes } from '@/utils/theme';

function ThemeSwitcher() {
    const themes = Object.keys(presetThemes);

    return (
        <select onChange={(e) => applyPresetTheme(e.target.value)}>
            {themes.map((theme) => (
                <option key={theme} value={theme}>
                    {theme}
                </option>
            ))}
        </select>
    );
}
```

### Custom Color Picker

```tsx
import { setColorVariable } from '@/utils/theme';

function ColorPicker() {
    return (
        <input
            type="color"
            onChange={(e) => setColorVariable('--color-primary-500', e.target.value)}
            defaultValue="#3b82f6"
        />
    );
}
```
