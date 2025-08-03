import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, SSEMessageData } from './chatApi';
import { useChatStore } from '../model/store';
import { ChatMessage } from '@/shared';
import { v4 as uuidv4 } from 'uuid';
import { QUERY_KEYS } from '@/shared/lib/react-query';
import { createStreamingHandler, StreamingEvent } from '../lib/streamingHandler';

export interface SendMessageParams {
    content: string;
    threadId?: string;
}

// 메시지를 서버로 보내는 역할
// 1. 메시지 입력 처리 > 유저가 메시지를 보내면 곧바로 화면에 반영
// 2. SSE 스트리밍 처리 > 서버에서 실시간으로 응답을 보내주면 처리
// 3. 상태 업데이트 loading > sending > success/error
// 4. 캐싱/ 무효화 처리 > 전송 성공시 쿼리를 자동 새로 고침
export const useSendMessageMutation = () => {
    const queryClient = useQueryClient();
    const addMessage = useChatStore((state) => state.addMessage);
    const updateMessage = useChatStore((state) => state.updateMessage);
    const removeMessage = useChatStore((state) => state.removeMessage);
    const setCurrentThreadId = useChatStore((state) => state.setCurrentThreadId);
    const setLoading = useChatStore((state) => state.setLoading);
    const currentThreadId = useChatStore((state) => state.currentThreadId);

    return useMutation({
        // mutationFn : 서버로 요청을 보내는 함수 > 메시지 전송 및 SSE처리
        // SSE(Streaming Server-Sent Events) : 클라이언트(브라우저)가 서버로부터 실시간으로 데이터를 받아올 수 있게 하는 HTTP 기반의 단방향 통신 기술
        // 즉, 서버가 클라이언트에게 푸시하듯 계속 데이터를 보내주는 방식
        mutationFn: async ({ content, threadId }: SendMessageParams) => {
            setLoading(true);
            // 메시지는 message queue에 쌓이게되고 role이 user이면 우측에 / assistant이면 좌측에 렌더링된다
            // Create user message
            const userMessage: ChatMessage = {
                id: uuidv4(),
                role: 'user',
                content,
                createdAt: new Date().toISOString(),
                status: 'success', // 화면에 바로 출력되기 위함
            };

            addMessage(userMessage);
            // 유저가 메시지를 입력하면 messages 배열에 추가되고 바로 UI에 렌더링됨(status가 success이므로) => 낙관적 UI 업데이트(optimistic UI)

            try {
                // Get current messages for the request
                // message에 쌓인 성공인 메시지와 유저가 갓 보낸 메시지를 모두 전송
                // 이전 대화의 문맥이 있어야 제대로 응답할 수 있기때문
                const currentMessages = [
                    ...useChatStore.getState().messages.filter((m) => m.status === 'success'),
                    userMessage,
                ];

                // Send request
                const response = await chatApi.sendMessage(currentMessages, threadId || currentThreadId);

                // Create placeholder assistant message > ai가 답변중인 메시지를 화면에 띄움. 처음에는 빈칸이나 점점 글자 채움
                const assistantPlaceholderId = uuidv4();
                const assistantPlaceholder: ChatMessage = {
                    id: assistantPlaceholderId,
                    role: 'assistant',
                    content: '',
                    createdAt: new Date().toISOString(),
                    status: 'sending', // 빈 말 풍선이 생기고 onEvent 콜백을 통해 실시간으로 텍스트가 채워짐
                };
                addMessage(assistantPlaceholder);

                // Process SSE stream with the new streaming handler
                let assistantMessageId: string | null = assistantPlaceholderId;

                // TODO: Group Study 개선 과제
                // 1. 메시지 상태 관리 최적화: 낙관적 업데이트 vs 서버 확인 전략
                // 2. 오프라인 지원: 네트워크 끊김 시 메시지 큐잉
                // 3. 메시지 중복 방지: 재전송 시 중복 메시지 처리
                // 4. 실시간 타이핑 인디케이터: 더 정교한 사용자 피드백

                // streamingHandler : 이벤트 실시간 처리
                // placeholder가 생긴 뒤
                // streamingHandler.handleStream(response)가 실행되고
                // 응답 조각이 도착할 때마다: updateMessage(assistantMessageId, { content: ... })가 호출되면서
                // placeholder에 내용이 덧붙여짐
                // 마지막에 [DONE]이 오면 상태를 'success'로 바꾸고 끝남
                const streamingHandler = createStreamingHandler({
                    messageId: assistantPlaceholderId,
                    currentThreadId: threadId || currentThreadId,
                    timeout: 30000,

                    // 스트리밍 이벤트 처리
                    onEvent: (event: StreamingEvent) => {
                        if (event.type === 'message' && event.data) {
                            const messageData = event.data as SSEMessageData;

                            // 스레드 ID 업데이트
                            if (messageData.conversationId && !currentThreadId) {
                                setCurrentThreadId(messageData.conversationId);
                            }

                            // 메시지 ID 동기화
                            // TODO: 개선 - 메시지 ID 충돌 처리 로직 강화
                            if (messageData.id && messageData.id !== assistantMessageId) {
                                const oldId = assistantMessageId;
                                assistantMessageId = messageData.id;

                                if (oldId) {
                                    removeMessage(oldId);
                                }
                            }

                            // 어시스턴트 메시지 업데이트
                            if (messageData.content !== undefined) {
                                const assistantMessage: ChatMessage = {
                                    id: assistantMessageId!,
                                    role: 'assistant',
                                    content: messageData.content,
                                    createdAt: new Date().toISOString(),
                                    status: messageData.isDone ? 'success' : 'sending',
                                };

                                // TODO: 성능 개선 - 불필요한 스토어 조회 최적화
                                const currentMessages = useChatStore.getState().messages;
                                const existingMessage = currentMessages.find((m) => m.id === assistantMessageId);

                                if (existingMessage) {
                                    updateMessage(assistantMessageId!, assistantMessage);
                                } else {
                                    addMessage(assistantMessage);
                                }
                            }
                        } else if (event.type === 'timeout') {
                            // 타임아웃 처리
                            if (assistantMessageId) {
                                updateMessage(assistantMessageId, { status: 'error' });
                            }
                        }
                    },

                    // 완료 처리
                    onComplete: (_responseThreadId) => {
                        setLoading(false);
                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'success' });
                        }
                    },

                    // 에러 처리
                    onError: (error) => {
                        setLoading(false);
                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'error' });
                        }
                        console.error('Streaming error:', error);
                    },
                });

                return streamingHandler.handleStream(response);
            } catch (error) {
                setLoading(false);
                // If we have an assistant message placeholder, mark it as error
                const currentMessages = useChatStore.getState().messages;
                const assistantMessage = currentMessages.find((m) => m.role === 'assistant' && m.status === 'sending');
                if (assistantMessage) {
                    updateMessage(assistantMessage.id, { status: 'error' });
                }
                throw error;
            }
        },
        onSuccess: (responseThreadId) => {
            // 메시지 전송이 성공했을 때, 해당 스레드와 리스트 데이터를 강제로 새로 받아오게 함.
            // Invalidate thread queries when a message is sent
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.list() });

            // Invalidate thread messages for the current thread
            if (responseThreadId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.messages(responseThreadId) });
            }
        },
        onError: (error) => {
            console.error('Failed to send message:', error);
            setLoading(false);
        },
    });
};
