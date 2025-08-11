# 스트리밍 시스템 분석 보고서

## 1. 코드 플로우 분석

### useSendMessageMutation 실행 과정 단계별 설명

#### 단계 1: 초기화 및 상태 설정

```typescript
const addMessage = useChatStore((state) => state.addMessage);
const updateMessage = useChatStore((state) => state.updateMessage);
const setLoading = useChatStore((state) => state.setLoading);
```

- Zustand store에서 메시지 조작 함수들을 가져옴
- 상태 관리를 위한 함수들을 미리 준비

#### 단계 2: 사용자 메시지 생성 및 추가

```typescript
const userMessage: ChatMessage = {
    id: uuidv4(),
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
    status: 'success',
};
addMessage(userMessage);
```

- UUID로 고유 ID 생성
- 즉시 `success` 상태로 설정하여 낙관적 업데이트 수행
- store에 즉시 추가하여 UI에 반영

#### 단계 3: 어시스턴트 메시지 플레이스홀더 생성

```typescript
const assistantPlaceholder: ChatMessage = {
    id: assistantPlaceholderId,
    role: 'assistant',
    content: '',
    status: 'sending',
};
addMessage(assistantPlaceholder);
```

- 빈 컨텐츠로 어시스턴트 메시지 미리 생성
- `sending` 상태로 설정하여 로딩 상태 표시

#### 단계 4: 스트리밍 핸들러 생성 및 설정

```typescript
const streamingHandler = createStreamingHandler({
    messageId: assistantPlaceholderId,
    timeout: 30000,
    onEvent: (event: StreamingEvent) => {
        /* 이벤트 처리 로직 */
    },
    onComplete: (_responseThreadId) => {
        /* 완료 처리 */
    },
    onError: (error) => {
        /* 에러 처리 */
    },
});
```

- 30초 타임아웃 설정
- 이벤트별 콜백 함수 정의

### SSEStreamingHandler 생명주기 분석

#### 생명주기 단계:

1. **초기화**

    ```typescript
    constructor(private options: StreamingHandlerOptions = {}) {}
    ```

    - 옵션 설정 저장
    - 내부 상태 변수들 초기화

2. **스트림 처리 시작**

    ```typescript
    async handleStream(response: Response): Promise<string | undefined>
    ```

    - Response body에서 ReadableStream reader 생성
    - 타임아웃 설정
    - Promise 기반 비동기 처리 시작

3. **타임아웃 설정**

    ```typescript
    private setupTimeout(reject: (reason?: any) => void): void
    ```

    - 기본 30초 타임아웃 적용
    - 타임아웃 시 자동으로 연결 정리 및 에러 발생

4. **청크 처리 루프**

    ```typescript
    private async processStreamChunks()
    ```

    - ReadableStream에서 청크 단위로 데이터 읽기
    - TextDecoder로 바이트 배열을 문자열로 변환
    - 줄바꿈 기준으로 메시지 분할

5. **SSE 라인 파싱**

    ```typescript
    private processSSELine(line: string): StreamingEvent | null
    ```

    - `data: ` 접두사 확인 및 제거
    - `[DONE]` 신호 감지
    - JSON 파싱 및 메시지 데이터 추출

6. **정리 및 완료**
    ```typescript
    private handleComplete() / cleanup() / cancel()
    ```
    - 리소스 해제 (reader, timeout)
    - 완료 콜백 호출
    - 에러 상태 처리

### Zustand store 상태 변화 추적

#### 상태 구조:

```typescript
export interface ChatState {
    messages: ChatMessage[]; // 메시지 배열
    currentThreadId?: string; // 현재 스레드 ID
    loading: boolean; // 로딩 상태
}
```

#### 상태 변화 순서:

1. **`setLoading(true)`** - 요청 시작 시 로딩 상태 활성화
2. **`addMessage(userMessage)`** - 사용자 메시지 즉시 추가
3. **`addMessage(assistantPlaceholder)`** - 어시스턴트 플레이스홀더 추가
4. **`updateMessage(messageId, { content })`** - 스트리밍 중 컨텐츠 업데이트
5. **`updateMessage(messageId, { status: 'success' })`** - 완료 시 상태 변경
6. **`setLoading(false)`** - 요청 완료 시 로딩 상태 해제

## 2. 데이터 구조 분석

### SSEMessageData 인터페이스 필드별 설명

```typescript
export interface SSEMessageData {
    id: string; // 메시지 고유 식별자
    content: string; // 누적된 메시지 컨텐츠
    role: 'assistant'; // 항상 'assistant' 고정값
    conversationId: string; // 대화 스레드 식별자
    isDone: boolean; // 스트리밍 완료 여부
}
```

#### 필드별 상세 분석:

- **`id`**: UUID v4 형식의 고유 식별자, 서버에서 생성됨
- **`content`**: 스트리밍 과정에서 점진적으로 누적되는 전체 텍스트
- **`role`**: 타입 시스템에서 'assistant'로 고정하여 타입 안전성 보장
- **`conversationId`**: 스레드 관리를 위한 식별자, 신규 대화 시 서버에서 생성
- **`isDone`**: 스트리밍 완료 판별용, 마지막 청크에서만 `true`

### StreamingEvent 타입들의 용도와 발생 조건

```typescript
export interface StreamingEvent {
    type: 'message' | 'error' | 'done' | 'timeout';
    data?: any;
    messageId?: string;
    content?: string;
    conversationId?: string;
}
```

#### 타입별 발생 조건:

1. **`message`** 타입

    - **발생 조건**: SSE 데이터에 `data: ` 접두사가 있고 유효한 JSON인 경우
    - **용도**: 실시간 텍스트 업데이트
    - **포함 데이터**: content, messageId, conversationId

2. **`error`** 타입

    - **발생 조건**:
        - SSE에서 `event: error` 이벤트 수신 시
        - JSON 파싱 실패 시
        - 네트워크 오류 발생 시
    - **용도**: 에러 상태 처리 및 UI 알림

3. **`done`** 타입

    - **발생 조건**: SSE 데이터가 `[DONE]` 문자열인 경우
    - **용도**: 스트리밍 완료 신호, 리소스 정리 트리거

4. **`timeout`** 타입
    - **발생 조건**: 설정된 타임아웃(기본 30초) 초과 시
    - **용도**: 무한 대기 방지, 에러 처리

### ChatMessage 상태(sending, success, error) 전환 조건

```typescript
export type MessageStatus = 'sending' | 'success' | 'error';
```

#### 상태 전환 다이어그램:

```
초기 생성 → sending → success
            ↓
           error
```

#### 전환 조건별 상세 분석:

1. **`sending` 상태**

    - **설정 시점**: 어시스턴트 메시지 플레이스홀더 생성 시

2. **`success` 상태**

    - **전환 조건**:
        - 사용자 메시지: 생성 즉시
        - 어시스턴트 메시지: 스트리밍 완료 시
    - **트리거**: `onComplete` 콜백 실행 시

3. **`error` 상태**
    - **전환 조건**:
        - 타임아웃 발생 시
        - 스트리밍 에러 발생 시
        - API 요청 실패 시
    - **처리 방식**: 에러 메시지 또는 재시도 UI 표시
    - **복구**: 사용자 재전송으로만 가능

#### 상태 업데이트 메커니즘:

```typescript
// Zustand store의 updateMessage 액션 사용
updateMessage(messageId, { status: 'success' });
```

- 불변성 유지하며 특정 메시지만 업데이트
- React 컴포넌트 자동 리렌더링 트리거
- devtools를 통한 상태 변화 추적 가능

## 3. 에러 케이스 분석

### 현재 처리되는 에러 유형들

#### 1. JSON 파싱 에러

```typescript
try {
    const messageData: SSEMessageData = JSON.parse(data);
} catch (parseError) {
    console.warn('Failed to parse SSE data:', parseError);
    return null;
}
```

- **원인**: 서버에서 잘못된 형식의 JSON 전송
- **현재 처리**: console.warn으로 로그 출력 후 무시
- **영향**: 해당 청크만 손실, 스트리밍은 계속 진행

#### 2. 네트워크 타임아웃 에러

```typescript
this.timeoutId = setTimeout(() => {
    console.warn('SSE timeout, falling back to error state');
    this.options.onEvent?.({ type: 'timeout' });
    reject(new Error('SSE timeout'));
}, timeout);
```

- **원인**: 30초 내 응답 없음
- **현재 처리**: 메시지 상태를 'error'로 변경
- **영향**: 전체 메시지가 에러 상태로 표시

#### 3. SSE 이벤트 에러

```typescript
if (line.startsWith('event: error')) {
    return { type: 'error', data: 'SSE Error occurred' };
}
```

- **원인**: 서버에서 명시적 에러 이벤트 전송
- **현재 처리**: 일반적인 에러 메시지로 처리
- **영향**: 구체적인 에러 정보 손실

### 개선이 필요한 에러 시나리오들

#### 1. 구체적인 에러 메시지 부족

**현재 문제점**:

- 모든 에러가 "오류 발생"으로 동일하게 표시
- 사용자가 에러 원인을 알 수 없음
- 복구 방법에 대한 안내 부족

**개선 방향**:

- 에러 타입별 메시지 분류

#### 2. 자동 재시도 메커니즘 부재

**현재 문제점**:

- 일시적 네트워크 오류 시에도 수동 재시도 필요
- 타임아웃 발생 시 즉시 포기
- 파싱 에러 시 복구 시도 없음

**개선 방향**:

- 재시도 가능한 에러 판별 및 자동 재시도

#### 3. 부분 복구 전략 부족

**현재 문제점**:

- JSON 파싱 실패 시 전체 청크 무시
- 일부 데이터만 손상되어도 전체 메시지 실패 처리
- 스트리밍 중단 시 이미 받은 데이터 활용 불가

**개선 방향**:

- 부분 데이터 보존 및 복구
