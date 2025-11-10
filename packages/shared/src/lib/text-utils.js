'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isEmpty = exports.trimMessage = exports.getCommonPrefixLength = void 0;
const getCommonPrefixLength = (oldText, newText) => {
    let i = 0;
    while (i < oldText.length && i < newText.length && oldText[i] === newText[i]) {
        i++;
    }
    return i;
};
exports.getCommonPrefixLength = getCommonPrefixLength;
const trimMessage = (message) => message.trim();
exports.trimMessage = trimMessage;
const isEmpty = (message) => (0, exports.trimMessage)(message) === '';
exports.isEmpty = isEmpty;
//# sourceMappingURL=text-utils.js.map
