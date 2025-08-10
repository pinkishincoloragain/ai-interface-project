import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, SSEMessageData } from './chatApi';
import { useChatStore } from '../model/store';
import { ChatMessage } from '@/shared';
import { v4 as uuidv4 } from 'uuid';
import { QUERY_KEYS } from '@/shared/lib/react-query';
import { createStreamingHandler, StreamingEvent } from '../lib/streamingHandler';
import { getStreamingManager } from '../lib/streamingController';

export interface SendMessageParams {
    content: string;
    threadId?: string;
}

export const useSendMessageMutation = () => {
    const queryClient = useQueryClient();
    const addMessage = useChatStore((state) => state.addMessage);
    const updateMessage = useChatStore((state) => state.updateMessage);
    const removeMessage = useChatStore((state) => state.removeMessage);
    const setCurrentThreadId = useChatStore((state) => state.setCurrentThreadId);
    const setLoading = useChatStore((state) => state.setLoading);
    const setStreaming = useChatStore((state) => state.setStreaming);
    const currentThreadId = useChatStore((state) => state.currentThreadId);

    return useMutation({
        mutationFn: async ({ content, threadId }: SendMessageParams) => {
            setLoading(true);

            // Create user message
            const userMessage: ChatMessage = {
                id: uuidv4(),
                role: 'user',
                content,
                createdAt: new Date().toISOString(),
                status: 'success',
            };

            addMessage(userMessage);

            try {
                // Get current messages for the request
                const currentMessages = [
                    ...useChatStore.getState().messages.filter((m) => m.status === 'success'),
                    userMessage,
                ];

                // Send request
                const response = await chatApi.sendMessage(currentMessages, threadId || currentThreadId);

                // Create placeholder assistant message
                const assistantPlaceholderId = uuidv4();
                const assistantPlaceholder: ChatMessage = {
                    id: assistantPlaceholderId,
                    role: 'assistant',
                    content: '',
                    createdAt: new Date().toISOString(),
                    status: 'sending',
                };
                addMessage(assistantPlaceholder);

                // Process SSE stream with the new streaming handler
                let assistantMessageId: string | null = assistantPlaceholderId;

                // TODO: Group Study 개선 과제
                // 1. 메시지 상태 관리 최적화: 낙관적 업데이트 vs 서버 확인 전략
                // 2. 오프라인 지원: 네트워크 끊김 시 메시지 큐잉
                // 3. 메시지 중복 방지: 재전송 시 중복 메시지 처리
                // 4. 실시간 타이핑 인디케이터: 더 정교한 사용자 피드백

                // 스트림 관리자를 통해 AbortController 생성 및 관리
                const streamingManager = getStreamingManager();
                const streamId = `message-${assistantPlaceholderId}`;
                const abortController = streamingManager.startStream(streamId, {
                    threadId: threadId || currentThreadId,
                    messageId: assistantPlaceholderId,
                });

                // 스트리밍 상태 설정
                setStreaming(true, streamId);

                const streamingHandler = createStreamingHandler({
                    messageId: assistantPlaceholderId,
                    currentThreadId: threadId || currentThreadId,
                    timeout: 30000,
                    abortController,

                    // 중단 시 콜백
                    onAbort: () => {
                        console.log('Stream aborted for message:', assistantPlaceholderId);
                        setLoading(false);
                        setStreaming(false);
                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'error' });
                        }
                    },

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
                        setStreaming(false);
                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'success' });
                        }
                    },

                    // 에러 처리
                    onError: (error) => {
                        setLoading(false);
                        setStreaming(false);
                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'error' });
                        }
                        console.error('Streaming error:', error);
                    },
                });

                return streamingHandler.handleStream(response);
            } catch (error) {
                setLoading(false);
                setStreaming(false);
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
