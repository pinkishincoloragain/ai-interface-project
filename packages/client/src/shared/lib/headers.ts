/**
 * Ensures that a header value contains only ASCII characters
 * Non-ASCII characters are encoded using base64
 */
export function ensureAsciiHeaderValue(value: string): string {
    // Check if value contains only ASCII characters (0x00-0x7F)
    const isAscii = /^[\x00-\x7F]*$/.test(value);

    if (isAscii) {
        return value;
    }

    // Encode non-ASCII characters using base64
    try {
        return btoa(unescape(encodeURIComponent(value)));
    } catch (error) {
        console.warn('Failed to encode header value, using original value:', error);
        return value;
    }
}

/**
 * Creates an Authorization header with Bearer token, ensuring ASCII compliance
 */
export function createAuthorizationHeader(token: string): string {
    const asciiToken = ensureAsciiHeaderValue(token);
    return `Bearer ${asciiToken}`;
}
