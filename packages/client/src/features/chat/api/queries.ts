import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from './chatApi';
import { useChatStore } from '../model/store';
import { MessageFactory, type ChatMessage } from '@/entities/message';
import type { SSEMessageData } from '@/shared/api';
import { QUERY_KEYS } from '@/shared/lib/react-query';
import { createStreamingHandler } from '../lib/streamingHandler';

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
    const currentThreadId = useChatStore((state) => state.currentThreadId);

    const abortControllerRef = useRef<AbortController | null>(null);

    function getAbortController() {
        return abortControllerRef.current;
    }

    function setAbortController(controller: AbortController | null) {
        abortControllerRef.current = controller;
    }

    const sendMessageMutation = useMutation({
        mutationFn: async ({ content, threadId }: SendMessageParams) => {
            setLoading(true);

            // 새로운 AbortController 생성
            const abortController = new AbortController();
            setAbortController(abortController);

            // Create user message
            const userMessage = MessageFactory.createUserMessage(content);

            addMessage(userMessage);

            try {
                // Get current messages for the request
                const currentMessages = [
                    ...useChatStore.getState().messages.filter((m) => m.status === 'success'),
                    userMessage,
                ];

                // Send request with AbortSignal
                const response = await chatApi.sendMessage(
                    currentMessages,
                    threadId || currentThreadId,
                    abortController.signal
                );

                // Create placeholder assistant message
                const assistantPlaceholder = MessageFactory.createAssistantMessage('');
                addMessage(assistantPlaceholder);

                // Process SSE stream with the new streaming handler
                let assistantMessageId: string | null = assistantPlaceholder.id;
                let accumulatedContent = '';

                // TODO: Group Study 개선 과제
                // 1. 메시지 상태 관리 최적화: 낙관적 업데이트 vs 서버 확인 전략
                // 2. 오프라인 지원: 네트워크 끊김 시 메시지 큐잉
                // 3. 메시지 중복 방지: 재전송 시 중복 메시지 처리
                // 4. 실시간 타이핑 인디케이터: 더 정교한 사용자 피드백

                let responseThreadId = threadId || currentThreadId;
                const streamingHandler = createStreamingHandler({
                    timeout: 60000,
                    abortSignal: abortController.signal,

                    parseData: (json) => JSON.parse(json) as SSEMessageData,

                    // 스트리밍 이벤트 처리
                    onEvent: (event) => {
                        if (event.type === 'message' && event.data) {
                            const messageData = event.data;

                            // 스레드 ID 업데이트
                            if (messageData.conversationId && !currentThreadId) {
                                setCurrentThreadId(messageData.conversationId);
                                responseThreadId = messageData.conversationId;
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
                                // 스트리밍 컨텐츠 누적
                                accumulatedContent += messageData.content;

                                const assistantMessage: ChatMessage = {
                                    id: assistantMessageId!,
                                    role: 'assistant',
                                    content: accumulatedContent,
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
                    onComplete: () => {
                        setLoading(false);
                        setAbortController(null);

                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'success' });
                        }
                        // Invalidate queries after streaming completes
                        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.list() });
                        if (responseThreadId) {
                            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.messages(responseThreadId) });
                        }
                    },

                    // 중단 처리
                    onAborted: () => {
                        setLoading(false);
                        setAbortController(null);

                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'error' });
                        }
                        console.log('스트리밍이 사용자에 의해 중단되었습니다');
                    },

                    // 에러 처리
                    onError: (error) => {
                        setLoading(false);
                        setAbortController(null);

                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'error' });
                        }
                        console.error('Streaming error:', error);
                    },
                });

                return streamingHandler.handleStream(response);
            } catch (error) {
                setLoading(false);
                setAbortController(null);

                // If we have an assistant message placeholder, mark it as error
                const currentMessages = useChatStore.getState().messages;
                const assistantMessage = currentMessages.find((m) => m.role === 'assistant' && m.status === 'sending');
                if (assistantMessage) {
                    updateMessage(assistantMessage.id, { status: 'error' });
                }
                throw error;
            }
        },
        onError: (error) => {
            console.error('Failed to send message:', error);
            setLoading(false);
            setAbortController(null);
        },
    });

    return {
        sendMessageMutation,
        getAbortController,
    };
};
