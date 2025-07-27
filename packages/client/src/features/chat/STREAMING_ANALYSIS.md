# 스트리밍 시스템 분석 보고서

## 1. 코드 플로우 분석

- **useSendMessageMutation** 호출 과정
  1. 사용자가 입력한 메시지를 `ChatMessage` 형태로 생성합니다.
  2. `chatApi.sendMessage`로 서버에 POST 요청을 보내고 `Response` 객체를 받습니다.
  3. `createStreamingHandler`를 통해 `SSEStreamingHandler` 인스턴스를 생성하고 `handleStream`을 호출합니다.
  4. 스트림 이벤트에 따라 메시지 스토어를 업데이트하며, 완료되면 `onComplete` 콜백이 실행됩니다.

- **SSEStreamingHandler 생명주기**
  1. `handleStream`에서 `Response.body.getReader()`로 스트림 리더를 획득합니다.
  2. `processStreamChunks`가 반복적으로 청크를 읽어 UTF-8로 디코딩합니다.
  3. 각 라인을 `processSSELine`으로 파싱하여 이벤트(`message`, `error`, `done`)를 발생시킵니다.
  4. 완료 혹은 에러 시 `cleanup`으로 리소스를 정리합니다.

- **Zustand 상태 변화**
  - `addMessage`, `updateMessage` 등이 호출되며 `messages` 배열을 갱신합니다.
  - `setCurrentThreadId`로 현재 스레드 ID를 유지합니다.

## 2. 데이터 구조 분석

- **SSEMessageData**
  - `id`: 메시지 식별자
  - `content`: assistant가 전송한 텍스트
  - `role`: 항상 `"assistant"`
  - `conversationId`: 현재 스레드 ID
  - `isDone`: 스트림 완료 여부

- **StreamingEvent**
  - `type`: `message` \| `error` \| `done` \| `timeout`
  - `data`: 파싱된 `SSEMessageData`
  - `messageId`: 스트리밍 중인 메시지 ID
  - `conversationId`: 스레드 식별자

- **ChatMessage 상태 전환**
  - `sending` → 서버 응답 대기 중
  - `success` → 메시지 수신 완료
  - `error` → 에러 또는 타임아웃 발생

## 3. 에러 케이스 분석

- **네트워크 오류**: `chatApi.sendMessage` 단계에서 발생할 수 있으며, Mutation의 `onError`에서 처리합니다.
- **파싱 실패**: `processSSELine`에서 JSON 파싱 실패 시 콘솔 경고만 남기고 무시됩니다.
- **타임아웃**: 지정한 시간 내 스트림이 완료되지 않으면 `timeout` 이벤트가 발생하고 메시지 상태가 `error`로 변경됩니다.

## 4. 개선점 제안

1. **타입 검증 강화**: `SSEMessageData` 구조를 Zod로 검증하여 런타임 안정성을 높입니다.
2. **재시도 로직 도입**: 네트워크 오류 시 일정 횟수까지 재연결을 시도하도록 개선합니다.
3. **상태 머신 도입**: `StreamingState` enum을 활용해 스트리밍 진행 상태를 명확히 관리합니다.
4. **유닛 테스트 추가**: Mock SSE 스트림을 만들어 `SSEStreamingHandler` 동작을 테스트할 수 있도록 합니다.

