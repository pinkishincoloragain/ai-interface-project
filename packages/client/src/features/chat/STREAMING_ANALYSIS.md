# 스트리밍 시스템 분석 보고서

## 1. 코드 플로우 분석

### 1-1. useSendMessageMutation 실행 과정

1. 유저 메시지 생성 → message queue에 추가

```
const userMessage: ChatMessage = { ... };
addMessage(userMessage);
```

2. 이전 메시지들과 함께 API 호출(currentMessage 참고)

```
const currentMessages = [
  ...useChatStore.getState().messages.filter(m => m.status === 'success'),
  userMessage,
];
const response = await chatApi.sendMessage(currentMessages, threadId || currentThreadId);
```

3. assistant placeholder 생성 → message queue에 추가

```
const assistantPlaceholder: ChatMessage = { ... };
addMessage(assistantPlaceholder);
```

4. SSE 스트리밍 시작

```
   const handler = createStreamingHandler(...)
   handler.handleStream(response)
```

5. onEvent → 메시지 내용 채워나감

```
onEvent: (event) => {
  if (event.type === 'message' && event.data?.content) {
    updateMessage(assistantMessageId, { content: event.data.content, ... });
  }
}
```

6. onComplete → 스트리밍 완료 처리

```
onComplete: () => {
  updateMessage(assistantMessageId, { status: 'success' });
  setLoading(false);
}
```

7. onError → 실패 처리

```
onError: () => {
  updateMessage(assistantMessageId, { status: 'error' });
  setLoading(false);
}
```

8. queryClient.invalidateQueries → 캐시 정리

```
onSuccess: (responseThreadId) => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.list() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.messages(responseThreadId) });
}
```

### 1-2. SSEStreamingHandler 생명주기

1. 인스턴스 생성

```
   const handler = createStreamingHandler(options);
```

- StreamingHandlerOptions를 인자로 받아 내부 상태 설정
- onEvent, onError, onComplete 콜백 등 주입
- 내부 변수 초기화: reader, decoder, buffer, timeoutId 등

2. 스트림 시작

```
   await handler.handleStream(response);
```

- response.body가 없으면 에러 throw
- ReadableStream.getReader()로 스트림 reader 생성
- setupTimeout()으로 타임아웃 타이머 시작
- processStreamChunks() 호출하여 본격적인 데이터 읽기 시작

3. 청크 단위 데이터 처리

```
      const { done, value } = await reader.read();
```

- TextDecoder로 수신된 청크(바이트)를 문자열로 변환
- \n 기준으로 라인 단위로 나눠 처리
- 라인이 data: 로 시작하면 JSON 파싱 시도
- 파싱 성공 시 onEvent({ type: 'message', ... }) 콜백 실행
- 파싱 실패 시 null 반환 및 경고 로그 출력

4. 완료 처리 - [DONE] 수신 시

```
return { type: 'done' };
```

→ handleComplete() 호출
→ 내부 리소스 정리 후 onComplete(threadId) 콜백 실행
→ resolve(threadId)

5. 에러 처리

- "event: error" 수신 시:

```
return { type: 'error', data: 'SSE Error occurred' };
```

- JSON 파싱 실패, 네트워크 에러 등 발생 시:

```
this.handleError(reject, error);
```

→ onError(error) 콜백 실행
→ reject(error)

6. 타임아웃 처리

- 지정된 시간 안에 isComplete가 되지 않으면:

```
onEvent({ type: 'timeout', messageId });
reject(new Error('SSE timeout'));
```

타이머는 setTimeout()으로 관리되며, cleanup()에서 정리됨

7. 리소스 정리 (cleanup)

```
   clearTimeout(this.timeoutId);
   this.reader?.releaseLock();
   this.reader = null;
   this.buffer = '';
```

- 타이머 해제
- reader release
- 버퍼 초기화

8. 수동 중단

```
handler.cancel();
```

- isComplete = true로 설정
- 내부 리소스 정리만 수행 (콜백은 호출되지 않음)

### 1-3. Zustand store 상태 변화

| 함수명                              | 변경 대상 상태    | 설명                                                                                                     |
| ----------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `addMessage(message)`               | `messages`        | 새로운 메시지를 배열에 추가함.<br>→ `messages = [...messages, message]`                                  |
| `setMessages(messages)`             | `messages`        | 전체 메시지를 한 번에 교체함.<br>→ `messages = 전달된 배열`                                              |
| `updateMessage(messageId, updates)` | `messages`        | 특정 메시지 ID에 해당하는 항목을 찾아서 수정함.<br>→ 내용(content) 또는 상태(status)를 바꿀 때 주로 사용 |
| `removeMessage(messageId)`          | `messages`        | 특정 ID의 메시지를 삭제함.                                                                               |
| `setCurrentThreadId(threadId)`      | `currentThreadId` | 현재 사용 중인 스레드 ID를 설정함.                                                                       |
| `setLoading(loading)`               | `loading`         | 현재 로딩 중인지 여부를 설정함.                                                                          |
| `clearMessages()`                   | `messages`        | 메시지 배열을 비움.                                                                                      |

## 2. 데이터 구조 분석

### 2-1. SSEMessageData 인터페이스 필드별 설명

```
export interface SSEMessageData {
  id: string; //assistant 메시지의 고유 ID (스트리밍 중간에 변경 가능)
  content: string; //assistant가 생성 중인 메시지의 청크 내용
  role: 'assistant'; //메시지 발신자 역할 (고정값 'assistant')
  conversationId: string; //이 메시지가 속한 대화(conversation)의 ID
  isDone: boolean; //전체 메시지 생성 완료 여부 (true면 최종 청크)
}
```

### 2-2. StreamingEvent 타입들의 용도와 발생 조건

```
type StreamingEvent =
  | {
      type: 'message';           // assistant의 스트리밍 청크가 도착했을 때 발생
      data?: SSEMessageData;     // 스트리밍으로 받은 데이터 (선택적, 실제 메시지 내용 포함)
    }
  | {
      type: 'timeout';           // 지정된 시간(예: 30초) 안에 응답이 없을 경우 발생
    }
  | {
      type: 'error';             // SSE 연결 중 에러 발생 시 사용됨
      error: any;                // 에러 객체 포함
    };
```

### 2-3. ChatMessage 상태(sending, success, error) 전환 조건

- user의 메시지는 바로 > success 상태로 : 화면에 바로 렌더링됨
- assistant placeholder 메시지를 생성할 때 > 응답이 도착하기까지 sending
- 스트리밍 완료시(isDone === true) > success
- 스트리밍 중 오류 발생 > error

## 3. 에러 케이스 분석

### 3-1. 현재 처리되는 에러 유형들

1. HTTP 요청 실패 (Fetch 실패 또는 4xx/5xx 응답)
   chatApi.sendMessage()에서 .ok 체크 후 예외 발생
   예: 네트워크 오류, 인증 실패, 서버 장애 등

2. SSE 스트림 도중 오류 발생
   스트리밍 중 서버가 연결을 끊거나 유효하지 않은 데이터가 오는 경우
   SSE 파싱 로직에서 catch된 경우

3. 스트리밍 도중 isDone이 오지 않음 (서버 쪽 비정상 종료)
   메시지 상태가 sending으로 남고 success로 전환되지 않음
   사용자 입장에서는 "입력 중…"만 보이며 멈춰 있는 것처럼 보임

### 3-2. 각 에러에 대한 사용자 피드백 방식

| 에러 상황        | 사용자에게 보이는 UI                               | 내부 처리                             |
| ---------------- | -------------------------------------------------- | ------------------------------------- |
| HTTP 오류        | “오류 발생” 텍스트, 메시지 박스에 붉은 테두리 표시 | `message.status = 'error'`            |
| SSE 중 파싱 오류 | “오류 발생” 텍스트, 붉은 테두리                    | try-catch 후 상태 업데이트            |
| `isDone` 미도달  | 계속 ‘입력 중…’으로 보이며 응답 없음               | 상태 업데이트 미진행 (`sending` 유지) |
| 정상 응답 완료   | 마크다운 메시지 정상 렌더링                        | `status = 'success'`                  |

=> UI는 MarkdownMessageItem.tsx 기준으로 메시지 status 값에 따라 스타일링 및 메시지를 조절하고 있음.
status === 'error'일 때 붉은 테두리, "오류 발생" 텍스트 노출됨.

### 3-3. 개선이 필요한 에러 시나리오들

- ‘재시도(Retry)’ 버튼 제공 필요
  현재는 에러 발생 시 단순 텍스트만 보여줌
  해결책: status === 'error' 상태일 때 "다시 시도" 버튼 노출하고, 동일 메시지를 다시 전송할 수 있도록 핸들러 연결

- isDone이 오지 않아 sending 상태에서 멈추는 케이스 감지 필요
  일정 시간 이상 응답이 없으면 에러로 처리하는 타이머 로직 필요 (예: 20초 이상 대기 시 error로 간주)

- 에러 로그 수집 및 사용자 피드백 제공
  예: "서버와의 연결이 끊겼습니다. 다시 시도해주세요." 같은 문구 추가
  콘솔에만 찍는 것이 아니라, UI 상에도 사유를 더 명확히 전달할 수 있음

- 에러 상태 메시지를 재전송할 수 있는 구조로 리팩토링 필요
  예: onRetryMessage(messageId) 함수 상위 컴포넌트에서 넘겨받아 처리
