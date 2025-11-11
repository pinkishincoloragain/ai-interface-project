export const getCommonPrefixLength = (oldText, newText) => {
    let i = 0;
    while (i < oldText.length && i < newText.length && oldText[i] === newText[i]) {
        i++;
    }
    return i;
};
export const trimMessage = (message) => message.trim();
export const isEmpty = (message) => trimMessage(message) === '';
