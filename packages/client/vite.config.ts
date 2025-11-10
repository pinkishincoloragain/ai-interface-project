import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        hmr: {
            port: 24678,
        },
        // Disabled proxy - connecting directly to AWS Lambda
        // proxy: {
        //     '/api': {
        //         target: 'http://localhost:3001',
        //         ...
        //     },
        // },
    },
    resolve: {
        alias: {
            '@/shared': resolve(__dirname, './src/shared'),
            '@/features': resolve(__dirname, './src/features'),
            '@components': resolve(__dirname, './src/components'),
            '@hooks': resolve(__dirname, './src/hooks'),
            '@utils': resolve(__dirname, './src/utils'),
            '@types': resolve(__dirname, './src/types'),
            '@': resolve(__dirname, './src'),
            shared: resolve(__dirname, '../shared/src'),
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
});
