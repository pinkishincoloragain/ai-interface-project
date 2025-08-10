/**
 * SSE 스트림 중단 관리자
 *
 * Assignment 3: SSE Stream Abort Logic 구현
 * - AbortController를 활용한 스트림 취소
 * - 여러 스트림 동시 관리
 * - 컴포넌트 언마운트 시 자동 정리
 * - 사용자 인터페이스에 "중단" 버튼 추가
 */

export interface StreamController {
    abortController: AbortController;
    streamId: string;
    isActive: boolean;
    startTime: number;
    threadId?: string;
    messageId?: string;
}

export class StreamingAbortManager {
    private activeStreams = new Map<string, StreamController>();
    private cleanup: (() => void) | null = null;

    constructor() {
        // 브라우저 종료 시 모든 스트림 정리
        this.cleanup = () => {
            this.abortAllStreams();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this.cleanup);
            window.addEventListener('unload', this.cleanup);
        }
    }

    /**
     * 새로운 스트림 시작
     *
     * @param streamId 스트림 고유 ID
     * @param options 스트림 옵션 (threadId, messageId)
     * @returns AbortController 인스턴스
     */
    startStream(streamId: string, options?: { threadId?: string; messageId?: string }): AbortController {
        // 기존 스트림이 있으면 중단
        if (this.activeStreams.has(streamId)) {
            this.abortStream(streamId);
        }

        const abortController = new AbortController();
        const streamController: StreamController = {
            abortController,
            streamId,
            isActive: true,
            startTime: Date.now(),
            threadId: options?.threadId,
            messageId: options?.messageId,
        };

        this.activeStreams.set(streamId, streamController);

        // AbortController가 중단되면 스트림 정보 업데이트
        abortController.signal.addEventListener('abort', () => {
            const controller = this.activeStreams.get(streamId);
            if (controller) {
                controller.isActive = false;
            }
        });

        return abortController;
    }

    /**
     * 특정 스트림 중단
     *
     * @param streamId 중단할 스트림 ID
     * @returns 중단 성공 여부
     */
    abortStream(streamId: string): boolean {
        const streamController = this.activeStreams.get(streamId);

        if (!streamController) {
            return false;
        }

        if (!streamController.abortController.signal.aborted) {
            streamController.abortController.abort('User requested cancellation');
        }

        streamController.isActive = false;
        this.activeStreams.delete(streamId);

        return true;
    }

    /**
     * 모든 활성 스트림 중단
     *
     * @returns 중단된 스트림 개수
     */
    abortAllStreams(): number {
        const abortedCount = this.activeStreams.size;

        for (const [streamId, controller] of this.activeStreams) {
            if (!controller.abortController.signal.aborted) {
                controller.abortController.abort('Manager cleanup');
            }
            controller.isActive = false;
        }

        this.activeStreams.clear();
        return abortedCount;
    }

    /**
     * 특정 스레드의 모든 스트림 중단
     *
     * @param threadId 스레드 ID
     * @returns 중단된 스트림 개수
     */
    abortStreamsByThread(threadId: string): number {
        let abortedCount = 0;

        for (const [streamId, controller] of this.activeStreams) {
            if (controller.threadId === threadId) {
                if (this.abortStream(streamId)) {
                    abortedCount++;
                }
            }
        }

        return abortedCount;
    }

    /**
     * 특정 메시지의 스트림 중단
     *
     * @param messageId 메시지 ID
     * @returns 중단 성공 여부
     */
    abortStreamByMessage(messageId: string): boolean {
        for (const [streamId, controller] of this.activeStreams) {
            if (controller.messageId === messageId) {
                return this.abortStream(streamId);
            }
        }

        return false;
    }

    /**
     * 스트림 활성 상태 확인
     *
     * @param streamId 스트림 ID
     * @returns 활성 상태 여부
     */
    isStreamActive(streamId: string): boolean {
        const controller = this.activeStreams.get(streamId);
        return controller?.isActive === true && !controller.abortController.signal.aborted;
    }

    /**
     * 활성 스트림 목록 조회
     *
     * @returns 활성 스트림 정보 배열
     */
    getActiveStreams(): StreamController[] {
        return Array.from(this.activeStreams.values()).filter((controller) => controller.isActive);
    }

    /**
     * 스트림 실행 시간 조회
     *
     * @param streamId 스트림 ID
     * @returns 실행 시간 (밀리초), 스트림이 없으면 -1
     */
    getStreamDuration(streamId: string): number {
        const controller = this.activeStreams.get(streamId);
        return controller ? Date.now() - controller.startTime : -1;
    }

    /**
     * 장시간 실행 중인 스트림 정리
     *
     * @param maxDurationMs 최대 허용 시간 (밀리초)
     * @returns 정리된 스트림 개수
     */
    cleanupLongRunningStreams(maxDurationMs: number = 300000): number {
        // 기본 5분
        let cleanedCount = 0;
        const now = Date.now();

        for (const [streamId, controller] of this.activeStreams) {
            if (now - controller.startTime > maxDurationMs) {
                if (this.abortStream(streamId)) {
                    cleanedCount++;
                }
            }
        }

        return cleanedCount;
    }

    /**
     * 리소스 정리
     * 모든 스트림을 중단하고 이벤트 리스너 제거
     */
    destroy(): void {
        this.abortAllStreams();

        if (this.cleanup && typeof window !== 'undefined') {
            window.removeEventListener('beforeunload', this.cleanup);
            window.removeEventListener('unload', this.cleanup);
            this.cleanup = null;
        }
    }
}

// 싱글톤 인스턴스
let globalStreamingManager: StreamingAbortManager | null = null;

/**
 * 글로벌 스트리밍 관리자 인스턴스 반환
 *
 * @returns StreamingAbortManager 인스턴스
 */
export const getStreamingManager = (): StreamingAbortManager => {
    if (!globalStreamingManager) {
        globalStreamingManager = new StreamingAbortManager();
    }
    return globalStreamingManager;
};

/**
 * React Hook: 스트리밍 제어 기능 제공
 *
 * @param options 옵션 설정
 * @returns 스트리밍 제어 함수들
 */
export const useStreamingController = (options?: { autoCleanup?: boolean; maxDuration?: number }) => {
    const manager = getStreamingManager();

    React.useEffect(() => {
        if (options?.autoCleanup) {
            const cleanup = () => manager.abortAllStreams();
            return cleanup;
        }
    }, [manager, options?.autoCleanup]);

    // 정기적인 장시간 스트림 정리
    React.useEffect(() => {
        if (options?.maxDuration) {
            const interval = setInterval(() => {
                manager.cleanupLongRunningStreams(options.maxDuration);
            }, 60000); // 1분마다 확인

            return () => clearInterval(interval);
        }
    }, [manager, options?.maxDuration]);

    return {
        startStream: manager.startStream.bind(manager),
        abortStream: manager.abortStream.bind(manager),
        abortAllStreams: manager.abortAllStreams.bind(manager),
        abortStreamsByThread: manager.abortStreamsByThread.bind(manager),
        abortStreamByMessage: manager.abortStreamByMessage.bind(manager),
        isStreamActive: manager.isStreamActive.bind(manager),
        getActiveStreams: manager.getActiveStreams.bind(manager),
        getStreamDuration: manager.getStreamDuration.bind(manager),
    };
};

// React import for useEffect
import React from 'react';
