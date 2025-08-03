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

### 1-3. Zustand store 상태 변화

## 2. 데이터 구조 분석

### 2-1. SSEMessageData 인터페이스 필드별 설명

### 2-2. StreamingEvent 타입들의 용도와 발생 조건

### 2-3. ChatMessage 상태(sending, success, error) 전환 조건

## 3. 에러 케이스 분석

### 3-1. 현재 처리되는 에러 유형들

### 3-2. 각 에러에 대한 사용자 피드백 방식

### 3-3. 개선이 필요한 에러 시나리오들
