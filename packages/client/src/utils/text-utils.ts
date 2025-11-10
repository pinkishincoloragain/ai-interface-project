export const getCommonPrefixLength = (oldText: string, newText: string): number => {
    let i = 0;
    while (i < oldText.length && i < newText.length && oldText[i] === newText[i]) {
        i++;
    }
    return i;
};

export const trimMessage = (message: string): string => message.trim();

export const isEmpty = (message: string): boolean => trimMessage(message) === '';
