# 스트리밍 시스템 분석 보고서

## 1. 코드 플로우 분석

### useSendMessageMutation 실행 과정 단계별 설명

1. **사용자 메시지 생성 및 저장** (`queries.ts:28-36`)

    - UUID를 사용해 고유한 사용자 메시지 생성
    - Zustand store에 즉시 메시지 추가 (낙관적 업데이트)
    - 메시지 상태는 `success`로 설정

2. **HTTP 요청 전송** (`queries.ts:46`)

    - `chatApi.sendMessage()`를 통해 SSE 엔드포인트(`/api/chat/sse`)로 POST 요청
    - 현재 성공 상태인 모든 메시지와 새 사용자 메시지를 포함하여 전송

3. **어시스턴트 플레이스홀더 생성** (`queries.ts:49-57`)

    - 빈 content를 가진 어시스턴트 메시지 생성
    - 상태는 `sending`으로 설정하여 로딩 표시

4. **SSE 스트림 처리 시작** (`queries.ts:68-138`)
    - `createStreamingHandler()`로 SSEStreamingHandler 인스턴스 생성
    - timeout 30초 설정
    - 이벤트 핸들러 콜백 등록

### SSEStreamingHandler 생명주기 분석

1. **초기화 단계** (`streamingHandler.ts:67`)

    - 옵션 설정 (timeout, messageId, currentThreadId, callbacks)
    - 내부 상태 초기화 (reader, decoder, buffer, isComplete)

2. **스트림 연결 단계** (`streamingHandler.ts:75-91`)

    - Response body에서 ReadableStreamReader 생성
    - Promise 기반 비동기 처리 시작
    - timeout 타이머 설정

3. **청크 처리 단계** (`streamingHandler.ts:124-160`)

    - `while(true)` 루프로 연속적인 청크 읽기
    - TextDecoder로 UTF-8 디코딩
    - 개행 문자로 라인 분할
    - 각 라인을 SSE 프로토콜에 따라 파싱

4. **이벤트 처리 단계** (`streamingHandler.ts:170-209`)

    - `data: ` 접두사로 메시지 데이터 식별
    - `[DONE]` 신호로 완료 감지
    - JSON 파싱 후 onEvent 콜백 호출

5. **정리 단계** (`streamingHandler.ts:244-256`)
    - timeout 타이머 정리
    - ReadableStreamReader 해제
    - 버퍼 정리

### Zustand store 상태 변화 추적

1. **메시지 추가 플로우**

    ```
    사용자 입력 → addMessage(userMessage) → addMessage(assistantPlaceholder)
    ```

2. **스트리밍 중 업데이트 플로우**

    ```
    SSE 데이터 수신 → onEvent 콜백 → updateMessage(assistantMessageId, newContent)
    ```

3. **메시지 ID 동기화 플로우** (`queries.ts:85-92`)
    ```
    서버에서 새로운 메시지 ID → 기존 플레이스홀더 제거 → 새 메시지 추가
    ```

## 2. 데이터 구조 분석

### SSEMessageData 인터페이스 필드별 설명 (`chatApi.ts:16-22`)

```typescript
interface SSEMessageData {
    id: string; // 서버에서 생성한 메시지 고유 ID
    content: string; // 현재까지 누적된 메시지 내용
    role: 'assistant'; // 항상 'assistant' (타입 안전성)
    conversationId: string; // 스레드/대화 고유 ID
    isDone: boolean; // 메시지 완료 여부
}
```

### StreamingEvent 타입들의 용도와 발생 조건 (`streamingHandler.ts:6-12`)

- **`message`**: SSE 데이터 수신 시 발생, 메시지 내용 업데이트용
- **`error`**: SSE 에러 이벤트 또는 파싱 실패 시 발생
- **`done`**: `[DONE]` 신호 수신 시 발생, 스트림 완료 표시
- **`timeout`**: 설정된 시간(30초) 초과 시 발생

### ChatMessage 상태(sending, success, error) 전환 조건

```
sending → success: isDone = true 또는 onComplete 호출 시
sending → error: 네트워크 에러, 파싱 에러, timeout 발생 시
success → (변경없음): 한번 성공하면 상태 유지
```

## 3. 에러 케이스 분석

### 현재 처리되는 에러 유형들

1. **네트워크 에러** (`chatApi.ts:37-39`)

    - HTTP 응답 코드 400+ 상태
    - fetch 요청 실패

2. **SSE 파싱 에러** (`streamingHandler.ts:198-202`)

    - JSON.parse() 실패
    - 잘못된 SSE 형식

3. **타임아웃 에러** (`streamingHandler.ts:103-113`)

    - 30초 응답 없음
    - 사용자에게 timeout 이벤트 전달

4. **스트림 읽기 에러** (`streamingHandler.ts:157-159`)
    - ReadableStream 처리 중 예외

### 각 에러에 대한 사용자 피드백 방식

1. **즉시 상태 업데이트**: 메시지 상태를 `error`로 변경
2. **콘솔 로깅**: 개발자를 위한 상세 에러 정보
3. **UI 표시**: MessageList에서 에러 상태 시각적 표시

### 개선이 필요한 에러 시나리오들

1. **부분 메시지 손실**

    - 스트림 중단 시 받은 내용 보존 필요
    - 현재는 완전히 실패로 처리됨

2. **재시도 로직 부재**

    - 일시적 네트워크 문제 시 자동 재시도 없음
    - 사용자가 수동으로 다시 전송해야 함

3. **에러 메시지 표준화**
    - 다양한 에러 타입에 대한 일관된 메시지 필요
    - 사용자 친화적 에러 안내 부족

## 4. 성능 분석

### 현재 성능 특성

**장점:**

- SSE를 통한 실시간 스트리밍으로 빠른 첫 응답
- Zustand의 효율적인 상태 관리
- React Query의 캐싱 및 백그라운드 업데이트

**병목점:**

- 매 청크마다 상태 업데이트로 인한 리렌더링
- JSON 파싱이 메인 스레드에서 실행
- 긴 메시지의 경우 DOM 업데이트 오버헤드

### 메모리 사용 패턴

- **누적 메시지**: 스토어에 모든 메시지 유지
- **버퍼 관리**: 스트림 읽기용 임시 버퍼 (`buffer` 필드)
- **정리**: timeout 및 reader 정리로 메모리 누수 방지

## 5. 개선 제안

### 1. 타입 안전성 강화

- Zod 스키마를 활용한 SSE 데이터 검증
- 런타임 타입 가드 구현
- 더 구체적인 에러 타입 정의

### 2. 복원력 개선

- 자동 재연결 메커니즘 구현
- 부분 메시지 복구 로직
- 네트워크 상태 모니터링

### 3. 성능 최적화

- 메시지 가상화 (긴 대화 목록)
- Web Worker를 통한 JSON 파싱 오프로드
- 배치 업데이트로 리렌더링 최소화

### 4. 사용자 경험 개선

- 스트리밍 중단 기능 (AbortController)
- 적응형 스트리밍 속도 조절
- 더 정교한 로딩 상태 표시

### 5. 모니터링 및 디버깅

- 스트리밍 메트릭 수집
- 에러 리포팅 시스템
- 개발자 도구 지원

## 6. 테스트 권장사항

1. **단위 테스트**: SSEStreamingHandler 클래스 메서드별 테스트
2. **통합 테스트**: 전체 메시지 플로우 시나리오 테스트
3. **에러 시나리오**: 다양한 실패 상황 시뮬레이션
4. **성능 테스트**: 대용량 메시지 및 장시간 스트리밍 테스트
5. **Mock 도구**: MSW를 활용한 SSE 응답 시뮬레이션

---

_분석 완료일: 2025-08-10_
_분석자: Claude (AI Assistant)_
