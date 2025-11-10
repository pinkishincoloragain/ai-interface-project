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
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                timeout: 60000,
                proxyTimeout: 60000,
                secure: false,
                ws: false,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, req, res) => {
                        // eslint-disable-next-line no-console
                        console.log('Proxy error:', err.message);
                        // eslint-disable-next-line no-console
                        console.log('Request URL:', req.url);
                        if (!res.headersSent) {
                            res.writeHead(500, {
                                'Content-Type': 'application/json',
                            });
                            res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
                        }
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        // eslint-disable-next-line no-console
                        console.log('→ Proxy Request:', req.method, req.url, '→', proxyReq.getHeader('host'));
                    });
                    proxy.on('proxyRes', (proxyRes, req, _res) => {
                        // eslint-disable-next-line no-console
                        console.log('← Proxy Response:', proxyRes.statusCode, req.url);
                    });
                    proxy.on('proxyReqError', (err: Error, req: any, res: any) => {
                        // eslint-disable-next-line no-console
                        console.log('Proxy request error:', err.message, 'for', req.url);
                        if (!res.headersSent) {
                            res.writeHead(500, {
                                'Content-Type': 'application/json',
                            });
                            res.end(JSON.stringify({ error: 'Proxy request error: ' + err.message }));
                        }
                    });
                },
            },
        },
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
