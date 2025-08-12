export interface ThrottleConfig {
    minDelay?: number; // 최소 지연 시간 (ms)
    maxDelay?: number; // 최대 지연 시간 (ms)
    initialDelay?: number; // 초기 지연 시간
    chunkSize?: number; // 청크 크기 (글자 수)
    adaptive?: boolean; // 적응형 모드
}

const DEFAULT_CONFIG: Required<ThrottleConfig> = {
    minDelay: 10,
    maxDelay: 100,
    initialDelay: 50, // 기본 타이핑 속도
    chunkSize: 1,
    adaptive: false,
};

class StreamThrottler {
    private timer: NodeJS.Timeout | null = null;

    /**
     * 텍스트 청크를 받아서 지정된 딜레이와 크기로 분할하여 콜백을 호출합니다.
     * @param textChunk - 처리할 텍스트 문자열
     * @param onChunk - 분할된 텍스트 조각을 처리할 콜백 함수
     * @param config - 속도 조절 설정
     */
    public processText(textChunk: string, onChunk: (chunk: string) => void, config: ThrottleConfig = {}): void {
        const { initialDelay, chunkSize } = { ...DEFAULT_CONFIG, ...config };

        let i = 0;
        const process = () => {
            if (i < textChunk.length) {
                const end = Math.min(i + chunkSize, textChunk.length);
                onChunk(textChunk.substring(i, end));
                i += chunkSize;

                // TODO: 여기에 적응형 딜레이 계산 로직 추가
                this.timer = setTimeout(process, initialDelay);
            } else {
                this.stop();
            }
        };

        this.stop(); // 이전 타이머가 있다면 중지
        process();
    }

    /**
     * 현재 진행 중인 스트림 처리를 중지합니다.
     */
    public stop(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    // TODO: 과제 요구사항에 맞춰 추가 메서드 구현
    // calculateOptimalDelay(networkSpeed: number): number { ... }
    // adjustChunkSize(contentType: string): number { ... }
}

export const streamThrottler = new StreamThrottler();
