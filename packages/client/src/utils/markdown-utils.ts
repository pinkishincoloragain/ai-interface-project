export interface TokenState {
    content: string;
    isNew: boolean;
}

export const getMarkdownStyles = () => {
    const fadeInKeyframes = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

    const markdownStyles = `
    ${fadeInKeyframes}
    
    /* Dark theme markdown styles */
    .markdown-body h1 {
      font-size: 2em;
      border-bottom: 1px solid #4b5563;
      padding-bottom: 0.3em;
      color: #f9fafb;
    }
    
    .markdown-body h2 {
      font-size: 1.5em;
      border-bottom: 1px solid #4b5563;
      padding-bottom: 0.3em;
      color: #f9fafb;
    }
    
    .markdown-body h3 {
      font-size: 1.25em;
      color: #f3f4f6;
    }
    
    .markdown-body h4 {
      font-size: 1em;
      color: #f3f4f6;
    }
    
    .markdown-body h5 {
      font-size: 0.875em;
      color: #f3f4f6;
    }
    
    .markdown-body h6 {
      font-size: 0.85em;
      color: #d1d5db;
    }
    
    .markdown-body blockquote {
      padding: 0 1em;
      color: #d1d5db;
      border-left: 0.25em solid #6b7280;
      margin: 0;
    }
    
    .markdown-body table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    
    .markdown-body table th,
    .markdown-body table td {
      padding: 6px 13px;
      border: 1px solid #4b5563;
      color: #f3f4f6;
    }
    
    .markdown-body table tr {
      background-color: #374151;
      border-top: 1px solid #4b5563;
    }
    
    .markdown-body table tr:nth-child(2n) {
      background-color: #4b5563;
    }
    
    .markdown-body img {
      max-width: 100%;
      box-sizing: content-box;
    }
    
    .markdown-body hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #4b5563;
      border: 0;
    }
    
    .markdown-body p {
      color: #f9fafb;
    }
    
    .markdown-body li {
      color: #f9fafb;
    }
    
    .markdown-body ul, .markdown-body ol {
      color: #f9fafb;
    }
    
    .markdown-body strong {
      color: #ffffff;
    }
    
    .markdown-body em {
      color: #f3f4f6;
    }
    
    .markdown-body a {
      color: #60a5fa;
    }
    
    .markdown-body a:hover {
      color: #93c5fd;
    }
  `;

    return markdownStyles;
};

export const getMarkdownContainerStyle = () => ({
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    lineHeight: 1.6,
    color: '#f9fafb',
});

export const getCodeBlockStyle = () => ({
    borderRadius: '6px',
    fontSize: '0.9em',
    margin: '1em 0',
    padding: '0.5em',
    overflow: 'auto',
    backgroundColor: '#1f2937',
    border: '1px solid #4b5563',
    color: '#f9fafb',
});

export const getInlineCodeStyle = () => ({
    padding: '0.2em 0.4em',
    margin: '0',
    fontSize: '85%',
    backgroundColor: '#374151',
    borderRadius: '3px',
    fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
    color: '#f9fafb',
});

export const getTokenStyle = () => ({
    transition: 'opacity 0.5s ease-in-out',
});

export const getFadeInStyle = () => ({
    animation: 'fadeIn 0.5s ease-in-out',
});
