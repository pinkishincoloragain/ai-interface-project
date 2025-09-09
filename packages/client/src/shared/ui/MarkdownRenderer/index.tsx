import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';
import {
    getCodeBlockStyle,
    getCommonPrefixLength,
    getInlineCodeStyle,
    getMarkdownContainerStyle,
    getMarkdownStyles,
    TokenState,
} from 'shared';

// Register highlight.js languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', html);
hljs.registerLanguage('xml', html);

interface MarkdownRendererProps {
    content: string;
    isStreaming?: boolean;
    className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
    ({ content, isStreaming = false, className = '' }) => {
        const [tokens, setTokens] = useState<TokenState[]>([]);
        const prevContentRef = useRef<string>('');

        // Style definitions
        // const tokenStyle = getTokenStyle();
        // const fadeInStyle = getFadeInStyle();
        const markdownContainerStyle = getMarkdownContainerStyle();
        const codeBlockStyle = getCodeBlockStyle();
        const inlineCodeStyle = getInlineCodeStyle();

        useEffect(() => {
            // Add keyframes and additional markdown styles
            const styleElement = document.createElement('style');
            styleElement.textContent = `
            ${getMarkdownStyles()}
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }
            .typing-indicator {
                animation: blink 1s infinite;
            }
        `;
            document.head.appendChild(styleElement);

            return () => {
                if (document.head.contains(styleElement)) {
                    document.head.removeChild(styleElement);
                }
            };
        }, []);

        useEffect(() => {
            // Identify new text when content changes
            if (content !== prevContentRef.current) {
                const prevContent = prevContentRef.current;
                const commonLength = getCommonPrefixLength(prevContent, content);

                if (commonLength === prevContent.length && prevContent.length > 0) {
                    // Only new text was added - append efficiently
                    const newContent = content.slice(commonLength);
                    if (newContent) {
                        setTokens((prev) => {
                            const updatedTokens = prev.map((token) => ({ ...token, isNew: false }));
                            return [...updatedTokens, { content: newContent, isNew: true }];
                        });
                    }
                } else {
                    // Text was changed or is initial content - replace entirely
                    setTokens([{ content, isNew: isStreaming }]);
                }

                prevContentRef.current = content;
            }
        }, [content, isStreaming]);

        useEffect(() => {
            // Remove 'new' status after animation time
            if (isStreaming) {
                const timer = setTimeout(() => {
                    setTokens((current) => current.map((token) => ({ ...token, isNew: false })));
                }, 300); // Reduced animation time for better performance

                return () => clearTimeout(timer);
            }
        }, [tokens, isStreaming]);

        // Render the complete content as markdown for better performance
        return (
            <div className={`markdown-body ${className}`} style={markdownContainerStyle}>
                <ReactMarkdown
                    rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }], rehypeRaw]}
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        code: (props: any) => {
                            const match = /language-(\w+)/.exec(props.className || '');
                            const language = match && match[1] ? match[1] : '';

                            // Check if parent is pre tag to determine if it's a code block
                            const isCodeBlock = props.node?.parentNode?.tagName === 'pre';

                            return isCodeBlock ? (
                                <div style={{ position: 'relative' }}>
                                    {language && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '0.5rem',
                                                right: '0.5rem',
                                                fontSize: '0.75rem',
                                                color: '#a0aec0',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                zIndex: 1,
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            {language}
                                        </div>
                                    )}
                                    <code className={props.className} style={codeBlockStyle}>
                                        {props.children}
                                    </code>
                                </div>
                            ) : (
                                <code style={inlineCodeStyle} className={props.className}>
                                    {props.children}
                                </code>
                            );
                        },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        pre: (props: any) => <pre style={{ margin: '1rem 0', overflow: 'auto' }}>{props.children}</pre>,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        h1: (props: any) => (
                            <h1 style={{ color: '#e2e8f0', marginTop: '2rem', marginBottom: '1rem' }}>
                                {props.children}
                            </h1>
                        ),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        h2: (props: any) => (
                            <h2
                                style={{
                                    color: '#e2e8f0',
                                    marginTop: '1.5rem',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                {props.children}
                            </h2>
                        ),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        h3: (props: any) => (
                            <h3
                                style={{
                                    color: '#e2e8f0',
                                    marginTop: '1.25rem',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                {props.children}
                            </h3>
                        ),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        p: (props: any) => <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>{props.children}</p>,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ul: (props: any) => (
                            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{props.children}</ul>
                        ),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ol: (props: any) => (
                            <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{props.children}</ol>
                        ),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        li: (props: any) => <li style={{ marginBottom: '0.25rem' }}>{props.children}</li>,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        blockquote: (props: any) => (
                            <blockquote
                                style={{
                                    borderLeft: '4px solid #4a5568',
                                    paddingLeft: '1rem',
                                    margin: '1rem 0',
                                    fontStyle: 'italic',
                                    color: '#a0aec0',
                                }}
                            >
                                {props.children}
                            </blockquote>
                        ),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        table: (props: any) => (
                            <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>{props.children}</table>
                            </div>
                        ),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        th: (props: any) => (
                            <th
                                style={{
                                    border: '1px solid #4a5568',
                                    padding: '0.5rem',
                                    backgroundColor: '#2d3748',
                                    fontWeight: 'bold',
                                }}
                            >
                                {props.children}
                            </th>
                        ),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        td: (props: any) => (
                            <td
                                style={{
                                    border: '1px solid #4a5568',
                                    padding: '0.5rem',
                                }}
                            >
                                {props.children}
                            </td>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
                {isStreaming && (
                    <span
                        className="typing-indicator"
                        style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '1.2em',
                            backgroundColor: '#60a5fa',
                            animation: 'blink 1s infinite',
                            marginLeft: '2px',
                        }}
                    />
                )}
            </div>
        );
    }
);

MarkdownRenderer.displayName = 'MarkdownRenderer';
