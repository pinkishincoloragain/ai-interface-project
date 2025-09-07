import type { SSEMessageData } from '@/shared/api';

/**
 * SSE 스트리밍 이벤트 타입 정의
 */
export interface StreamingEvent {
    type: 'message' | 'error' | 'done' | 'timeout';
    data?: SSEMessageData | string;
    messageId?: string;
    content?: string;
    conversationId?: string;
}

/**
 * 스트리밍 핸들러 옵션
 */
export interface StreamingHandlerOptions {
    /**
     * 스트리밍 타임아웃 (밀리초)
     * @default 30000
     */
    timeout?: number;

    /**
     * 메시지 ID (없으면 자동 생성)
     */
    messageId?: string;

    /**
     * 현재 스레드 ID
     */
    currentThreadId?: string;

    /**
     * 스트리밍 이벤트 콜백
     */
    onEvent?: (event: StreamingEvent) => void;

    /**
     * 에러 발생 시 콜백
     */
    onError?: (error: Error) => void;

    /**
     * 완료 시 콜백
     */
    onComplete?: (threadId?: string) => void;
}

/**
 * SSE 스트리밍 핸들러 클래스
 *
 * TODO: Group Study 개선 과제
 * 1. 타입 안정성 강화: SSE 메시지 스키마 검증 (Zod 등 활용)
 * 2. 에러 복구 로직: 연결 끊김 시 자동 재연결 메커니즘
 * 3. 백프레셔 처리: 메시지 처리 속도가 느릴 때 버퍼링 전략
 * 4. 메모리 최적화: 장시간 스트리밍 시 메모리 누수 방지
 * 5. 테스트 가능성: Mock SSE 스트림 생성기 구현
 */
export class SSEStreamingHandler {
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private decoder = new TextDecoder();
    private buffer = '';
    private isComplete = false;
    private timeoutId: NodeJS.Timeout | null = null;

    constructor(private options: StreamingHandlerOptions = {}) {}

    /**
     * SSE 스트림 처리 시작
     *
     * @param response - Fetch API Response 객체
     * @returns Promise<string | undefined> - 완료 시 스레드 ID 반환
     */
    async handleStream(response: Response): Promise<string | undefined> {
        // TODO: Response 유효성 검증 추가 (상태 코드, 헤더 확인)
        if (!response.body) {
            throw new Error('Response body is null');
        }

        this.reader = response.body.getReader();
        const responseThreadId = this.options.currentThreadId;

        return new Promise<string | undefined>((resolve, reject) => {
            // 타임아웃 설정
            this.setupTimeout(reject);

            // 스트림 처리 시작
            this.processStreamChunks(resolve, reject, responseThreadId);
        });
    }

    /**
     * 타임아웃 설정
     *
     * TODO: 동적 타임아웃 조정
     * - 메시지 길이에 따른 적응형 타임아웃
     * - 네트워크 상태에 따른 타임아웃 조정
     */
    private setupTimeout(reject: (reason?: Error) => void): void {
        const timeout = this.options.timeout || 30000;

        this.timeoutId = setTimeout(() => {
            if (!this.isComplete) {
                console.warn('SSE timeout, falling back to error state');
                this.options.onEvent?.({
                    type: 'timeout',
                    messageId: this.options.messageId,
                });
                this.cleanup();
                reject(new Error('SSE timeout'));
            }
        }, timeout);
    }

    /**
     * 스트림 청크 처리
     *
     * TODO: 성능 최적화
     * 1. Worker Thread 활용: 메인 스레드 블로킹 방지
     * 2. 청크 크기 최적화: 적절한 버퍼 크기 관리
     * 3. 배치 처리: 여러 메시지를 한 번에 처리
     */
    private async processStreamChunks(
        resolve: (value: string | undefined) => void,
        reject: (reason?: Error) => void,
        responseThreadId?: string
    ): Promise<void> {
        if (!this.reader) return;

        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await this.reader.read();
                if (done) break;

                // 텍스트 디코딩 및 라인 파싱
                this.buffer += this.decoder.decode(value, { stream: true });
                const lines = this.buffer.split('\n');
                this.buffer = lines.pop() || '';

                // 각 라인 처리
                for (const line of lines) {
                    const result = this.processSSELine(line);

                    if (result?.type === 'done') {
                        this.handleComplete(resolve, result.conversationId || responseThreadId);
                        return;
                    } else if (result?.type === 'error') {
                        const errorMessage = typeof result.data === 'string' ? result.data : 'SSE Error occurred';
                        this.handleError(reject, new Error(errorMessage));
                        return;
                    } else if (result?.conversationId) {
                        responseThreadId = result.conversationId;
                    }
                }
            }
        } catch (error) {
            this.handleError(reject, error as Error);
        }
    }

    /**
     * SSE 라인 파싱 및 처리
     *
     * TODO: 개선 사항
     * 1. 스키마 검증: 메시지 구조 유효성 검사
     * 2. 타입 가드: 런타임 타입 안정성 보장
     * 3. 에러 복구: 파싱 실패 시 복구 전략
     */
    private processSSELine(line: string): StreamingEvent | null {
        if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            // 스트림 완료 신호
            if (data === '[DONE]') {
                return { type: 'done' };
            }

            try {
                // TODO: Zod 스키마 검증 추가
                const messageData: SSEMessageData = JSON.parse(data);

                this.options.onEvent?.({
                    type: 'message',
                    data: messageData,
                    messageId: messageData.id,
                    content: messageData.content,
                    conversationId: messageData.conversationId,
                });

                return {
                    type: 'message',
                    data: messageData,
                    messageId: messageData.id,
                    content: messageData.content,
                    conversationId: messageData.conversationId,
                };
            } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
                // TODO: 파싱 실패 메트릭 수집
                return null;
            }
        } else if (line.startsWith('event: error')) {
            // TODO: 구조화된 에러 처리
            return { type: 'error', data: 'SSE Error occurred' };
        }

        return null;
    }

    /**
     * 스트림 완료 처리
     */
    private handleComplete(resolve: (value: string | undefined) => void, threadId?: string): void {
        this.isComplete = true;
        this.cleanup();
        this.options.onComplete?.(threadId);
        resolve(threadId);
    }

    /**
     * 에러 처리
     *
     * TODO: 에러 분류 및 복구 전략
     * 1. 네트워크 에러 vs 서버 에러 구분
     * 2. 재시도 가능한 에러 판별
     * 3. 사용자 친화적 에러 메시지 생성
     */
    private handleError(reject: (reason?: Error) => void, error: Error): void {
        console.error('SSE processing error:', error);
        this.cleanup();
        this.options.onError?.(error);
        reject(error);
    }

    /**
     * 리소스 정리
     *
     * TODO: 메모리 누수 방지
     * 1. 이벤트 리스너 정리
     * 2. 타이머 정리
     * 3. 스트림 연결 해제
     */
    private cleanup(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (this.reader) {
            this.reader.releaseLock();
            this.reader = null;
        }

        this.buffer = '';
    }

    /**
     * 스트림 중단
     *
     * TODO: Graceful shutdown
     * 1. 진행 중인 처리 완료 대기
     * 2. 부분 메시지 저장
     * 3. 재시작 지점 마킹
     */
    cancel(): void {
        this.isComplete = true;
        this.cleanup();
    }
}

/**
 * SSE 스트리밍 핸들러 팩토리 함수
 *
 * @param options - 스트리밍 옵션
 * @returns SSEStreamingHandler 인스턴스
 */
export function createStreamingHandler(options: StreamingHandlerOptions = {}): SSEStreamingHandler {
    return new SSEStreamingHandler(options);
}

/**
 * 스트리밍 상태 관리 유틸리티
 *
 * TODO: 상태 머신 구현
 * - IDLE -> CONNECTING -> STREAMING -> COMPLETED/ERROR
 * - 각 상태 전환 시 적절한 액션 수행
 */
export enum StreamingState {
    IDLE = 'idle',
    CONNECTING = 'connecting',
    STREAMING = 'streaming',
    COMPLETED = 'completed',
    ERROR = 'error',
    TIMEOUT = 'timeout',
}

/**
 * 스트리밍 메트릭 수집 인터페이스
 *
 * TODO: 모니터링 구현
 * - 스트리밍 지연시간 측정
 * - 에러율 추적
 * - 처리량 모니터링
 */
export interface StreamingMetrics {
    startTime: number;
    endTime?: number;
    bytesReceived: number;
    messagesProcessed: number;
    errorsEncountered: number;
}
