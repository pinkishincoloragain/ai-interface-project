# 시스템 개선 제안서 (ENHANCEMENT.md)

> **기반**: woong-jae의 PR #5 "1. 현재시스템 분석 (정재웅)" 분석 결과

## 📋 현재 시스템 문제점 요약

### 1. 단일 책임 원칙(SRP) 위반

- **`SSEStreamingHandler`의 역할 침범**
    - 스트림 처리 + 도메인 로직이 하나의 클래스에 혼재
    - 채팅 메시지 파싱, 상태 관리까지 담당
    - 재사용성 저하 및 테스트 복잡성 증가

### 2. 강한 결합도 (Tight Coupling)

- **도메인 필드의 직접 노출**
    - `messageId`, `conversationId`, `content`를 직접 전달
    - 프로토콜 계층이 비즈니스 로직에 의존
    - 채팅이 아닌 다른 용도로 재사용 불가

### 3. 에러 처리 체계의 미흡

- **일관성 없는 에러 메시지**
    - 모든 에러가 "오류 발생"으로 동일하게 표시
    - 복구 가능한 에러와 치명적 에러 구분 없음
- **자동 재시도 메커니즘 부재**
    - 일시적 네트워크 오류도 수동 재시도 필요
    - 부분 데이터 복구 전략 없음

## 🔧 주요 개선 방안

### 1. 아키텍처 재설계 - 책임 분리

#### 현재 구조

```
SSEStreamingHandler (역할 혼재)
├── 스트림 읽기/디코딩
├── SSE 라인 파싱
├── JSON 파싱
├── 도메인 상태 추적
└── 완료 처리
```

#### 제안하는 구조

```
SSEReader (전송/프로토콜 전담)
├── 스트림 읽기
├── SSE 스펙 파싱
└── Abort/Timeout

ChatSSEAdapter (도메인 해석/상태)
├── JSON 파싱
├── 스키마 검증
├── 상태 추적
└── 도메인 이벤트

ChatMessageSchema (검증/버전관리)
└── Zod 기반 타입 안전성
```

### 2. 타입 안전성 강화

#### 현재 인터페이스의 문제점

```typescript
// 현재: 도메인 필드가 프로토콜에 노출
interface StreamingEvent {
    type: 'message' | 'error' | 'done' | 'timeout';
    messageId?: string; // 도메인 필드
    content?: string; // 도메인 필드
    conversationId?: string; // 도메인 필드
}
```

#### 제안하는 개선안

```typescript
// 프로토콜 계층
interface RawSSEMessage {
    event?: string;
    id?: string;
    retry?: number;
    data: string;
}

// 도메인 계층
interface ChatMessage {
    id: string;
    content: string;
    conversationId: string;
    isDone: boolean;
}
```

### 3. 에러 처리 시스템 개선

#### 에러 분류 체계 도입

```typescript
enum ErrorType {
    NETWORK_ERROR = 'network_error',
    PARSE_ERROR = 'parse_error',
    TIMEOUT_ERROR = 'timeout_error',
    VALIDATION_ERROR = 'validation_error',
}

interface EnhancedError {
    type: ErrorType;
    message: string;
    recoverable: boolean;
    retryAfter?: number;
}
```

#### 자동 재시도 전략

- **지수 백오프 (Exponential Backoff)** 적용
- **재시도 가능한 에러 판별**
- **Circuit Breaker 패턴** 도입 고려

### 4. 테스트 용이성 개선

#### 현재 문제점

- 스트림 시뮬레이션 + 도메인 세팅 모두 필요
- 에러 상황 재현이 복잡
- 단위 테스트 작성 어려움

#### 개선 효과

- **각 계층별 독립적 테스트** 가능
- **Mock 객체 사용 용이성** 증가
- **에러 케이스 테스트** 단순화

## 📊 성능 최적화 제안

### 1. 메모리 사용량 최적화

- **스트림 버퍼 크기 조정**
- **가비지 컬렉션 최적화**
- **메모리 누수 방지 강화**

### 2. 응답 시간 개선

- **청크 처리 배치화**
- **DOM 업데이트 최적화** (React 측면)
- **불필요한 리렌더링 방지**

## 🔄 마이그레이션 전략

### Phase 1: 인터페이스 분리

1. `RawSSEMessage` 인터페이스 도입
2. `ChatSSEAdapter` 클래스 생성
3. 기존 코드와 병행 운영

### Phase 2: 구현체 교체

1. `SSEReader` 클래스 구현
2. 점진적 기능 이전
3. 테스트 커버리지 확보

### Phase 3: 레거시 제거

1. 기존 `SSEStreamingHandler` 제거
2. 불필요한 코드 정리
3. 문서화 업데이트

## 📈 기대 효과

### 1. 개발 효율성 향상

- **코드 재사용성** 증가
- **디버깅 시간** 단축
- **신규 기능 추가** 용이성

### 2. 시스템 안정성 증대

- **에러 복구 능력** 개선
- **타입 안전성** 강화
- **테스트 커버리지** 확대

### 3. 유지보수성 개선

- **단일 책임 원칙** 준수
- **느슨한 결합도** 달성
- **확장 가능한 구조** 구축

## 🚀 구현 우선순위

### 높음 (High)

- [ ] `SSEReader`와 `ChatSSEAdapter` 분리
- [ ] 에러 타입 분류 시스템 도입
- [ ] 기본적인 재시도 메커니즘 구현

### 중간 (Medium)

- [ ] Zod 기반 스키마 검증 도입
- [ ] 성능 모니터링 시스템 구축
- [ ] 종합적인 테스트 스위트 작성

### 낮음 (Low)

- [ ] Circuit Breaker 패턴 적용
- [ ] 메트릭 수집 및 대시보드 구축
- [ ] A/B 테스트 기반 최적화

---

**참고**: 이 문서는 woong-jae님의 상세한 시스템 분석 보고서를 기반으로 작성되었으며, 실제 구현 시에는 점진적 접근을 권장합니다.
