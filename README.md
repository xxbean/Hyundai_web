# Hyundai AI Chat 🚗

현대자동차 품질안전 AI 채팅 웹앱 (Vast.ai Serverless 기반)

---

## 기능

- 💬 질문 입력 → AI 답변
- 🧠 Reasoning 파트 별도 표시 (thinking 모델)
- 📋 시스템 프롬프트 선택 (영어 / 한국어 / 직접입력)
- 📊 대화 기록 엑셀 다운로드 (질문 | 답변 | 시간)
- ⚙️ Vast API Key, Endpoint, Model ID, Temperature, Max Tokens 설정 가능

---

## 기술 스택

- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Next.js API Route (Edge Runtime)
- **AI**: Vast.ai Serverless (vLLM 기반)
- **배포**: Vercel

---

## 🚀 배포 방법 (GitHub + Vercel)

### 1단계: GitHub에 올리기

```bash
cd qwen-chat
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/[내아이디]/[repo이름].git
git push -u origin main
```

### 2단계: Vercel 배포

1. https://vercel.com 접속 → GitHub 로그인
2. **"Add New Project"** 클릭 → repo 선택
3. **Environment Variables** 추가 (선택):
   - `VAST_API_KEY` = Vast.ai API Key
4. **Deploy** 클릭 → 2~3분 후 URL 생성

> API Key는 Vercel 환경변수 없이 웹 UI ⚙️ 설정에서 직접 입력해도 됩니다.

---

## 로컬 실행

```bash
npm install
npm run dev
# → http://localhost:3000
```

환경변수 쓰려면:
```bash
cp .env.local.example .env.local
# .env.local에 VAST_API_KEY 입력
```

---

## Vast.ai 연결 설정

웹 UI **⚙️ 설정** 에서:

| 항목 | 설명 | 기본값 |
|------|------|--------|
| Vast API Key | Vast.ai API Key | 서버 env 사용 |
| Endpoint ID | Vast Serverless endpoint 이름 | `HYUNDAI-CHAT-A100` |
| Model ID | 서버에 올라간 모델명 | `Qwen/Qwen3.5-27B` |
| Max Tokens | 최대 토큰 수 | `2048` |
| Temperature | 창의성 조절 (0~2) | `0.7` |

> 모델 바꾸려면 Vast.ai에서 새 endpoint 만들고 설정에서 Endpoint ID / Model ID 변경

---

## 엑셀 다운로드

대화 후 헤더에 **↓ 엑셀** 버튼 생성됩니다.
`AI_대화기록_날짜.xlsx` 로 저장되며 컬럼은 **질문 | 답변 | 시간** 입니다.

---

## Vast.ai Endpoint 설정 권장값

| 항목 | 권장값 |
|------|--------|
| Minimum Workers | 1 (항상 켜진 상태 유지) |
| Max Workers | 1 |
| Minimum Load | 1 |
