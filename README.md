# Qwen AI Chat 🤖

현대자동차 품질안전 AI 채팅 웹앱

## 기능
- 💬 실시간 스트리밍 답변
- 📋 시스템 프롬프트 직접 입력
- 📊 대화 기록 엑셀 다운로드 (질문/답변 컬럼)
- 🔌 HuggingFace API / Vast.ai 전환 가능

---

## 🚀 배포 방법 (GitHub + Vercel)

### 1단계: GitHub에 올리기

```bash
cd qwen-chat

git init
git add .
git commit -m "first commit"

# GitHub에서 새 repo 만들고:
git remote add origin https://github.com/[내아이디]/[repo이름].git
git push -u origin main
```

### 2단계: Vercel 배포

1. https://vercel.com 접속 → GitHub 로그인
2. **"New Project"** 클릭
3. GitHub repo 선택
4. **Environment Variables** 추가:
   - `HF_API_KEY` = `hf_...` (HuggingFace 토큰)
5. **Deploy** 클릭 → 2~3분이면 완료

→ `https://[프로젝트명].vercel.app` URL 생성됨

---

## 로컬 실행

```bash
cd qwen-chat
cp .env.local.example .env.local
# .env.local에 HF_API_KEY 입력

npm install
npm run dev
# → http://localhost:3000
```

---

## Vast.ai로 전환하기

웹 UI에서 **⚙ 설정** 클릭 → **Custom API URL** 칸에 입력:
```
https://[vast-instance].vast.ai/v1/chat/completions
```
저장 없이 바로 적용됩니다.

---

## 엑셀 다운로드

대화를 몇 번 하면 헤더에 **↓ 엑셀** 버튼이 생깁니다.
클릭하면 `AI_대화기록_날짜.xlsx` 파일로 저장됩니다.
컬럼: **질문 | 답변 | 시간**
