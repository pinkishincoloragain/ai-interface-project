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

1. 유저 메시지 추가 → addMessage(userMessage)
2. 어시스턴트 placeholder 추가 → addMessage(assistantPlaceholder)
3. SSE 이벤트 수신 시 메시지 갱신
   → updateMessage(id, { content, status }) 또는 addMessage (id 변경 시)
4. SSE 완료 시 상태 갱신
   → updateMessage(id, { status: 'success' })
5. SSE 에러 또는 타임아웃 시 상태 갱신
   → updateMessage(id, { status: 'error' })

## 2. 데이터 구조 분석

### 2-1. SSEMessageData 인터페이스 필드별 설명

### 2-2. StreamingEvent 타입들의 용도와 발생 조건

### 2-3. ChatMessage 상태(sending, success, error) 전환 조건

## 3. 에러 케이스 분석

### 3-1. 현재 처리되는 에러 유형들

### 3-2. 각 에러에 대한 사용자 피드백 방식

### 3-3. 개선이 필요한 에러 시나리오들
