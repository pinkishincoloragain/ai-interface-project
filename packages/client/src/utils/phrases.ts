export const phrases = {
    ui: {
        input: {
            placeholder: '메시지를 입력하세요...',
            sendButton: '전송',
        },
        message: {
            sending: '전송 중...',
            error: '오류 발생',
        },
        chat: {
            startConversation: '대화를 시작해보세요.',
            title: '채팅 인터페이스',
        },
    },
    comments: {
        autoHeightAdjust: '자동 높이 조절',
        resetHeightAfterSubmit: '제출 후 높이 초기화',
        imeInputHandling: 'IME 입력 중이 아닐 때만 Enter 키 처리',
        renderingLogic: '사용자 메시지는 일반 텍스트로, 어시스턴트 메시지는 마크다운으로 렌더링',
    },
} as const;

export type PhrasesType = typeof phrases;
