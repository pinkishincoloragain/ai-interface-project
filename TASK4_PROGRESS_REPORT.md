# 과제 4: 스트림 출력 속도 조절 및 최적화 구현 보고서

## 1. 개요

- **목표:** AI 채팅 응답의 사용자 경험(UX)을 향상시키기 위해, 텍스트가 실시간으로 타이핑되는 듯한 효과를 구현하고 출력 속도를 제어할 수 있는 기반을 마련합니다.
- **문제점:** 기존 시스템에서는 AI의 답변이 스트리밍으로 수신되더라도 최종 결과물이 한 번에 화면에 표시되었습니다. 이는 사용자가 긴 텍스트를 따라 읽기 어렵게 만들고, 시스템이 응답을 생성하는 과정을 시각적으로 보여주지 못하는 한계가 있었습니다.
- **해결 방안:**
    1.  사용자에게 텍스트가 한 글자씩 점진적으로 표시되는 **타이핑 효과**를 도입합니다.
    2.  스트리밍 중임을 명확히 인지시키는 **깜빡이는 커서**를 구현합니다.
    3.  향후 속도 조절 기능을 확장할 수 있도록 **속도 제어 로직을 중앙에서 관리**하는 모듈을 설계합니다.

---

## 2. 주요 구현 내용

### 1단계: 타이핑 효과 UI 구현

- **파일:** `packages/client/src/shared/ui/MarkdownRenderer/index.tsx`
- **내용:**
    - `displayedContent`라는 React 상태(state)를 추가하여, 화면에 실제로 보여질 텍스트를 관리하도록 했습니다.
    - `useEffect` 훅과 `setInterval`을 사용하여, 외부로부터 받은 전체 텍스트(`content` prop)를 일정 시간(50ms) 간격으로 한 글자씩 `displayedContent`에 추가하는 애니메이션 로직을 구현했습니다.
    - `isStreaming` 상태일 때, 텍스트의 마지막 부분에 깜빡이는 커서(`typing-indicator`)가 항상 따라다니도록 하여 사용자가 응답이 진행 중임을 직관적으로 알 수 있게 했습니다.

```tsx
// packages/client/src/shared/ui/MarkdownRenderer/index.tsx - 일부

useEffect(() => {
    if (isStreaming) {
        setShowCursor(true);
        if (content.length > displayedContent.length) {
            const newText = content.substring(displayedContent.length);
            let i = 0;
            const timer = setInterval(() => {
                setDisplayedContent((prev) => prev + newText[i]);
                i++;
                if (i >= newText.length) {
                    clearInterval(timer);
                }
            }, 50); // 50ms delay for typing effect

            return () => clearInterval(timer);
        }
    } else {
        setDisplayedContent(content);
        setShowCursor(false);
    }
}, [content, isStreaming]);

// ...

return (
    <div className={`markdown-body ${className}`}>
        <ReactMarkdown>{displayedContent}</ReactMarkdown>
        {showCursor && <span className="typing-indicator" />}
    </div>
);
```

### 2단계: 속도 제어 로직 기반 마련

- **파일:** `packages/client/src/features/chat/lib/streamThrottler.ts`
- **내용:**
    - 스트리밍 텍스트의 출력 속도를 중앙에서 관리하고 제어하기 위한 `StreamThrottler` 클래스를 생성했습니다.
    - `processText` 메서드는 원본 텍스트(chunk)와 콜백 함수를 인자로 받아, 설정된 `chunkSize`와 `initialDelay`에 맞춰 텍스트를 작은 조각으로 나누어 순차적으로 콜백을 호출하는 역할을 합니다.
    - 이 클래스는 향후 적응형 속도 조절, 사용자 설정 기능 등을 추가할 수 있는 확장 가능한 구조로 설계되었습니다.

```typescript
// packages/client/src/features/chat/lib/streamThrottler.ts - 일부

class StreamThrottler {
    public processText(textChunk: string, onChunk: (chunk: string) => void, config: ThrottleConfig = {}): void {
        const { initialDelay, chunkSize } = { ...DEFAULT_CONFIG, ...config };

        let i = 0;
        const process = () => {
            if (i < textChunk.length) {
                const end = Math.min(i + chunkSize, textChunk.length);
                onChunk(textChunk.substring(i, end));
                i += chunkSize;

                this.timer = setTimeout(process, initialDelay);
            } else {
                this.stop();
            }
        };

        this.stop();
        process();
    }
}
```

### 3단계: 스트리밍 핸들러와 통합

- **파일:** `packages/client/src/features/chat/lib/streamingHandler.ts`
- **내용:**
    - 서버로부터 SSE 이벤트를 수신하는 `SSEStreamingHandler`의 데이터 처리 흐름을 수정했습니다.
    - 기존에는 수신된 텍스트를 즉시 UI로 전달했지만, 이제 `streamThrottler.processText`를 거치도록 변경했습니다.
    - 이를 통해 데이터 수신부와 UI 렌더링부의 관심사를 분리하고, 속도 제어 로직을 한 곳에서 관리할 수 있게 되었습니다.

- **변경된 데이터 흐름:**
  `SSE 수신` ➔ `SSEStreamingHandler` ➔ `StreamThrottler` ➔ `UI 업데이트 콜백`

```typescript
// packages/client/src/features/chat/lib/streamingHandler.ts - 일부

private processSSELine(line: string): StreamingEvent | null {
    if (line.startsWith('data: ')) {
        // ...
        try {
            const messageData: SSEMessageData = JSON.parse(data);

            if (messageData.content) {
                streamThrottler.processText(messageData.content, (chunk) => {
                    this.options.onEvent?.({
                        type: 'message',
                        data: { ...messageData, content: chunk },
                        // ...
                    });
                });
            }
            // ...
        } catch (parseError) {
            // ...
        }
    }
    return null;
}
```

---

## 3. 결과

- AI의 답변이 스트리밍될 때, 사용자는 실제 사람이 타이핑을 치는 듯한 자연스러운 시각적 효과를 경험하게 됩니다.
- 메시지 끝에 위치한 커서는 현재 시스템이 응답을 생성 중임을 명확하게 인지시켜 주어 사용성을 개선합니다.
- 기본적인 타이핑 효과 및 속도 제어 기능이 성공적으로 구현되었습니다.

---

## 4. 향후 계획

구현된 기본 기능을 바탕으로 다음과 같은 추가 개선 과제를 진행할 수 있습니다.

- **적응형 속도 조절:** 네트워크 상태나 남은 텍스트의 길이에 따라 타이핑 속도를 동적으로 조절하여 최적의 사용자 경험을 제공합니다.
- **사용자 설정 기능:** 사용자가 직접 타이핑 속도를 (예: 빠름, 보통, 느림) 선택할 수 있는 옵션을 UI에 추가합니다.
- **콘텐츠별 차별화:** 일반 텍스트와 코드 블록의 출력 방식을 다르게 하여(예: 코드 블록은 한 번에 표시) 가독성을 향상시킵니다.
