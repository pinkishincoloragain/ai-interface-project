export interface TokenState {
    content: string;
    isNew: boolean;
}
export declare const getMarkdownStyles: () => string;
export declare const getMarkdownContainerStyle: () => {
    fontFamily: string;
    lineHeight: number;
    color: string;
};
export declare const getCodeBlockStyle: () => {
    borderRadius: string;
    fontSize: string;
    margin: string;
    padding: string;
    overflow: string;
    backgroundColor: string;
    border: string;
    color: string;
};
export declare const getInlineCodeStyle: () => {
    padding: string;
    margin: string;
    fontSize: string;
    backgroundColor: string;
    borderRadius: string;
    fontFamily: string;
    color: string;
};
export declare const getTokenStyle: () => {
    transition: string;
};
export declare const getFadeInStyle: () => {
    animation: string;
};
//# sourceMappingURL=markdown-utils.d.ts.map
