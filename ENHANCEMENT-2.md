# 현재 시스템 분석 및 개선 제안서 (ENHANCEMENT-2.md)

> **기반**: jinaSE0의 PR #2 "현재시스템 분석 (feature/system-analysis-jeonguhi)" 분석 결과

## 📋 스트리밍 시스템 분석 요약

### 1. 코드 플로우 분석 결과

#### `useSendMessageMutation` 실행 과정

- **현재 흐름**: 사용자 메시지 전송 → SSE 연결 생성 → 스트리밍 데이터 수신 → UI 업데이트
- **병목 지점**:
    - 메시지 전송과 스트리밍 시작 사이의 지연 시간
    - 단일 스레드에서의 순차적 처리로 인한 대기 시간
- **개선 필요 사항**: 병렬 처리 최적화 및 프리페칭 메커니즘 도입

#### `SSEStreamingHandler` 생명주기

- **초기화 단계**: 연결 설정 및 이벤트 리스너 등록
- **수신 단계**: 데이터 스트림 파싱 및 이벤트 발생
- **종료 단계**: 리소스 정리 및 상태 초기화
- **문제점**:
    - 예외 상황에서의 불완전한 리소스 정리
    - 재연결 로직의 부재
    - 메모리 누수 가능성

#### Zustand Store 상태 변화 추적

- **상태 전환**: `idle` → `sending` → `streaming` → `success`/`error`
- **상태 일관성**: 여러 컴포넌트 간 상태 동기화 이슈
- **성능 이슈**: 불필요한 리렌더링 발생

### 2. 데이터 구조 분석

#### `SSEMessageData` 인터페이스 필드별 분석

```typescript
interface SSEMessageData {
    messageId?: string; // 메시지 고유 식별자
    conversationId?: string; // 대화 세션 식별자
    content?: string; // 실제 스트리밍 콘텐츠
    type?: string; // 메시지 타입 (text, error, done)
    timestamp?: number; // 메시지 타임스탬프
}
```

**문제점**:

- 모든 필드가 옵셔널로 타입 안전성 부족
- 버전 관리 필드 부재
- 확장성을 고려하지 않은 평면적 구조

#### `StreamingEvent` 타입들의 용도와 발생 조건

- **`message`**: 일반 콘텐츠 스트리밍 시 발생
- **`error`**: 서버 오류 또는 네트워크 오류 시 발생
- **`done`**: 스트리밍 완료 시 발생
- **`timeout`**: 연결 타임아웃 시 발생

**개선 필요 사항**:

- 이벤트 우선순위 체계 부재
- 세분화된 에러 타입 필요
- 복구 가능성 정보 부족

#### `ChatMessage` 상태 전환 조건

- **`sending`**: 메시지 전송 요청 시
- **`success`**: 스트리밍 완료 및 성공적 저장 시
- **`error`**: 전송 실패 또는 서버 오류 시

### 3. 에러 케이스 분석

#### 현재 처리되는 에러 유형들

1. **네트워크 연결 오류**
    - 연결 실패, 타임아웃, 연결 중단
    - 현재 대응: 단순 에러 메시지 표시
2. **데이터 파싱 오류**
    - 잘못된 JSON 형식, 스키마 불일치
    - 현재 대응: 콘솔 로그 출력
3. **서버 응답 오류**
    - HTTP 상태 코드 에러, 비즈니스 로직 에러
    - 현재 대응: 통일된 "오류 발생" 메시지

#### 각 에러에 대한 사용자 피드백 방식

- **일관성 부족**: 모든 에러가 동일한 메시지로 표시
- **복구 옵션 부재**: 재시도 버튼 없음
- **진단 정보 부족**: 사용자가 문제 원인을 알 수 없음

#### 개선이 필요한 에러 시나리오들

1. **부분 데이터 손실**: 스트리밍 중간에 연결이 끊어진 경우
2. **중복 연결**: 사용자가 빠르게 여러 메시지를 전송한 경우
3. **세션 만료**: 장시간 비활성 후 재시도하는 경우

## 🔧 주요 개선 방안

### 1. 아키텍처 개선

#### 현재 구조의 문제점

```
SSEStreamingHandler
├── HTTP 연결 관리
├── 데이터 파싱
├── 상태 관리
├── 에러 처리
└── UI 업데이트 트리거
```

#### 제안하는 개선된 구조

```
ConnectionManager (연결 전담)
├── 연결 풀 관리
├── 재연결 로직
└── 상태 모니터링

DataProcessor (데이터 전담)
├── 스트림 파싱
├── 스키마 검증
└── 데이터 변환

ErrorHandler (에러 전담)
├── 에러 분류
├── 복구 전략
└── 사용자 피드백

StateManager (상태 전담)
├── 전역 상태 관리
├── 상태 동기화
└── 캐싱 전략
```

### 2. 데이터 구조 개선

#### 강타입 스키마 도입

```typescript
// Zod를 활용한 런타임 검증
const SSEMessageSchema = z.object({
    id: z.string(),
    conversationId: z.string(),
    content: z.string().optional(),
    type: z.enum(['content', 'error', 'complete']),
    version: z.string().default('1.0'),
    timestamp: z.number(),
    metadata: z.record(z.any()).optional(),
});
```

#### 계층적 이벤트 구조

```typescript
interface StreamingEventBase {
    id: string;
    timestamp: number;
    version: string;
}

interface ContentEvent extends StreamingEventBase {
    type: 'content';
    data: {
        messageId: string;
        chunk: string;
        position: number;
    };
}

interface ErrorEvent extends StreamingEventBase {
    type: 'error';
    data: {
        code: ErrorCode;
        message: string;
        recoverable: boolean;
        retryAfter?: number;
    };
}
```

### 3. 에러 처리 시스템 강화

#### 에러 분류 체계

```typescript
enum ErrorCode {
    // 네트워크 관련
    NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
    CONNECTION_LOST = 'CONNECTION_LOST',
    RATE_LIMITED = 'RATE_LIMITED',

    // 데이터 관련
    PARSE_ERROR = 'PARSE_ERROR',
    SCHEMA_VALIDATION = 'SCHEMA_VALIDATION',

    // 서버 관련
    SERVER_ERROR = 'SERVER_ERROR',
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

    // 클라이언트 관련
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    INVALID_REQUEST = 'INVALID_REQUEST',
}
```

#### 자동 복구 메커니즘

- **지수 백오프**: 재시도 간격을 점진적으로 증가
- **Circuit Breaker**: 연속 실패 시 일시적 차단
- **Graceful Degradation**: 기능 저하 모드로 전환

### 4. 성능 최적화

#### 메모리 관리

- **스트림 버퍼링**: 적절한 청크 크기 설정
- **가비지 컬렉션**: 사용하지 않는 객체 정리
- **메모리 누수 방지**: 이벤트 리스너 정리

#### 응답성 향상

- **Virtual DOM 최적화**: 불필요한 리렌더링 방지
- **배치 업데이트**: 여러 상태 변경을 묶어서 처리
- **Web Workers**: 무거운 작업을 별도 스레드에서 처리

## 📊 구현 우선순위

### Phase 1: 기본 안정성 확보 (2주)

- [ ] 에러 분류 시스템 도입
- [ ] 기본적인 재시도 메커니즘 구현
- [ ] 메모리 누수 방지 강화

### Phase 2: 아키텍처 개선 (4주)

- [ ] 책임 분리된 클래스 구조 구현
- [ ] 강타입 스키마 검증 도입
- [ ] 종합적인 테스트 스위트 작성

### Phase 3: 성능 최적화 (3주)

- [ ] 스트리밍 성능 최적화
- [ ] 상태 관리 최적화
- [ ] 모니터링 및 메트릭 수집

### Phase 4: 고급 기능 (3주)

- [ ] Circuit Breaker 패턴 적용
- [ ] A/B 테스트 기반 최적화
- [ ] 실시간 성능 대시보드

## 🎯 기대 효과

### 개발자 경험 개선

- **디버깅 시간 50% 단축**
- **코드 재사용성 3배 향상**
- **새 기능 개발 속도 2배 향상**

### 사용자 경험 개선

- **에러 복구율 80% 향상**
- **응답 속도 30% 개선**
- **시스템 안정성 95% 달성**

### 시스템 관리 개선

- **모니터링 가시성 확보**
- **장애 대응 시간 70% 단축**
- **운영 비용 25% 절감**

---

**참고**: 이 문서는 jinaSE0님의 상세한 현재 시스템 분석을 기반으로 작성되었으며, 실제 구현 시에는 단계적 접근을 권장합니다.
