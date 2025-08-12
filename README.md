# Seamless AI 인터페이스 프로젝트

OpenAI GPT 모델을 활용한 AI 채팅 인터페이스 구현 프로젝트

## 기술 스택

- **클라이언트**: React, TypeScript, Vite, TailwindCSS
- **서버**: Fastify, TypeScript, OpenAI SDK
- **AI 모델**: OpenAI GPT-3.5-turbo
- **패키지 관리**: PNPM 워크스페이스 (모노레포)
- **코드 품질**: ESLint, Prettier, Husky, lint-staged
- **테스트**: Jest, React Testing Library
- **배포**: Docker

## 프로젝트 구조

```
ai-interface-project/
├── packages/
│   ├── client/             # React + TypeScript 클라이언트
│   ├── server/             # Fastify 서버
│   └── shared/             # 공통 타입 및 유틸
├── .github/                # GitHub Actions 워크플로우
├── .husky/                 # Git hooks
├── .vscode/                # VS Code 설정
└── docker-compose.yml      # Docker 컴포즈 설정
```

## 지원 기능

- OpenAI GPT-3.5-turbo와 실시간 채팅
- 스트리밍 응답 지원
- REST API (GET/POST)
- Server-Sent Events (SSE)
- WebSocket

## 시작하기

### 필수 환경

- Node.js v16 이상
- PNPM v7 이상
- OpenAI API 키

### 환경 설정

1. **OpenAI API 키 설정**

    프로젝트 루트에 `.env` 파일을 생성하고 OpenAI API 키를 추가하세요:

    ```bash
    # .env 파일 생성
    cp .env.example .env
    ```

    `.env` 파일에 실제 API 키와 설정을 입력:

    ```env
    # OpenAI Configuration
    OPENAI_API_KEY=sk-your-actual-openai-api-key-here

    # OpenAI Model Configuration (default: gpt-4o-mini)
    OPENAI_MODEL=gpt-4o-mini

    # OpenAI API Settings
    OPENAI_MAX_TOKENS=1000
    OPENAI_TEMPERATURE=0.7
    ```

    > **중요**: OpenAI API 키는 [STREAMING_STUDY.md](https://github.com/pinkishincoloragain/ai-interface-project/blob/main/STREAMING_STUDY.md)) 최하단을 확인해주세요.

2. **OpenAI 설정 테스트**

    API 키가 올바르게 설정되었는지 확인하세요:

    ```bash
    # 명령줄에서 OpenAI 연결 테스트
    cd packages/server
    pnpm test:openai
    ```

    또는 서버 실행 후 HTTP 엔드포인트로 테스트:

    ```bash
    # 서버 실행
    pnpm dev:server

    # 브라우저에서 확인
    # http://localhost:3001/api/test/openai
    ```

### 설치

```bash
# 모든 패키지의 의존성 설치
pnpm install
```

### 개발 서버 실행

환경 설정이 완료되면 개발 서버를 실행하세요:

```bash
# 클라이언트와 서버 동시 실행
pnpm dev

# 클라이언트만 실행 (http://localhost:3000)
pnpm dev:client

# 서버만 실행 (http://localhost:3001)
pnpm dev:server
```

서버 실행 후 다음 URL에서 서비스를 확인할 수 있습니다:

- **클라이언트**: http://localhost:3000
- **서버 API**: http://localhost:3001
- **API 문서**: http://localhost:3001/documentation

### 코드 품질 관리

```bash
# 린트 실행
pnpm lint

# 린트 후 자동 수정
pnpm lint:fix

# 코드 포맷팅
pnpm format
```

### 테스트

```bash
# 테스트 실행
pnpm test

# 테스트 감시 모드
pnpm test:watch

# 테스트 커버리지 보고서
pnpm test:coverage
```

### 빌드

```bash
# 모든 패키지 빌드
pnpm build
```

### Docker로 실행

Docker를 사용하여 실행할 때도 환경 변수 설정이 필요합니다:

```bash
# .env 파일이 있는지 확인 후 실행
# 프로덕션 빌드 및 실행
docker-compose up --build

# 개발 환경에서 실행
docker-compose up --build dev
```

## API 엔드포인트

### 채팅 API

- **POST** `/api/chat` - 일반 채팅 메시지 전송
- **POST** `/api/chat/stream` - 스트리밍 채팅 응답
- **GET** `/api/conversations` - 대화 목록 조회
- **GET** `/api/conversations/:id` - 특정 대화 조회

### 테스트 API

- **GET** `/api/test/openai` - OpenAI API 연결 및 설정 테스트
- **GET** `/api/test/health` - 서버 상태 확인

### 환경 변수

| 변수명               | 설명                  | 기본값        | 필수 여부 |
| -------------------- | --------------------- | ------------- | --------- |
| `OPENAI_API_KEY`     | OpenAI API 키         | -             | 필수      |
| `OPENAI_MODEL`       | 사용할 OpenAI 모델    | `gpt-4o-mini` | 선택      |
| `OPENAI_MAX_TOKENS`  | 최대 완성 토큰 수     | `1000`        | 선택      |
| `OPENAI_TEMPERATURE` | 응답 창의성 (0.0-2.0) | `0.7`         | 선택      |

## 개발 가이드

### OpenAI 모델 설정 변경

기본적으로 `gpt-4o-mini` 모델을 사용합니다. 다른 모델을 사용하려면 `.env` 파일에서 변경할 수 있습니다:

```env
# 사용 가능한 모델들
OPENAI_MODEL=gpt-4o-mini      # 기본값 (빠르고 저렴)
OPENAI_MODEL=gpt-3.5-turbo    # 빠른 응답
OPENAI_MODEL=gpt-4            # 고품질 응답
OPENAI_MODEL=gpt-4-turbo      # 더 긴 컨텍스트
```

### 테스트 및 디버깅

프로젝트는 OpenAI 설정을 검증하기 위한 여러 도구를 제공합니다:

#### 1. 명령줄 테스트

```bash
cd packages/server
pnpm test:openai
```

#### 2. HTTP 엔드포인트 테스트

```bash
# 서버 실행 후
curl http://localhost:3001/api/test/openai

# 또는 브라우저에서
# http://localhost:3001/api/test/openai
```

#### 3. 응답 예시

성공적인 설정 시:

```json
{
    "success": true,
    "message": "OpenAI API connection successful",
    "model": "gpt-4o-mini",
    "timestamp": "2023-07-24T08:30:00.000Z"
}
```

실패 시:

```json
{
    "success": false,
    "error": "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
    "timestamp": "2023-07-24T08:30:00.000Z"
}
```

### 컴포넌트 추가하기

새로운 컴포넌트를 추가할 때는 다음 구조를 따라주세요:

```
src/components/ComponentName/
├── index.tsx           # 컴포넌트 코드
├── ComponentName.test.tsx  # 테스트 코드
└── ComponentName.module.css  # (선택적) 스타일
```

### 커스텀 훅 개발하기

커스텀 훅은 다음 구조를 따라주세요:

```
src/hooks/useHookName.ts
src/hooks/useHookName.test.ts
```

## 문제 해결

### 자주 발생하는 문제

1. **OpenAI API 키 오류**

    - `.env` 파일이 프로젝트 루트에 있는지 확인
    - API 키가 `sk-`로 시작하는지 확인
    - 계정에 충분한 크레딧이 있는지 확인
    - **테스트 명령 실행**: `cd packages/server && pnpm test:openai`

2. **서버 시작 오류**

    - Node.js 버전이 16 이상인지 확인
    - `pnpm install`로 의존성이 모두 설치되었는지 확인
    - OpenAI 설정이 올바른지 테스트: `pnpm test:openai`

3. **API 응답 오류**
    - `/api/test/openai` 엔드포인트로 연결 상태 확인
    - 브라우저에서 `http://localhost:3001/api/test/openai` 접속하여 상태 확인

## 문서화

- 각 컴포넌트와 중요 함수에는 JSDoc 주석을 추가해주세요.
- API 변경 사항은 이 README.md 파일을 업데이트해주세요.
