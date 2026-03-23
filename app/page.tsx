"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HistoryRow {
  question: string;
  answer: string;
  timestamp: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "당신은 현대자동차 품질안전 전문 AI 어시스턴트입니다. 정확하고 전문적으로 답변해주세요."
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [modelUrl, setModelUrl] = useState("");
  const [modelId, setModelId] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt,
          apiKey,
          modelUrl: modelUrl || undefined,
            modelId: modelId || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `❌ 오류: ${err}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const token =
              parsed?.choices?.[0]?.delta?.content ?? "";
            if (token) {
              fullText += token;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: fullText },
              ]);
            }
          } catch {}
        }
      }

      // 히스토리 저장
      setHistory((prev) => [
        ...prev,
        {
          question: userMsg.content,
          answer: fullText,
          timestamp: new Date().toLocaleString("ko-KR"),
        },
      ]);
    } catch (e: unknown) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `❌ ${String(e)}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, systemPrompt, apiKey, modelUrl, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const downloadExcel = () => {
    if (history.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(
      history.map((h) => ({
        질문: h.question,
        답변: h.answer,
        시간: h.timestamp,
      }))
    );
    ws["!cols"] = [{ wch: 50 }, { wch: 80 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "대화기록");
    XLSX.writeFile(wb, `AI_대화기록_${new Date().toLocaleDateString("ko-KR")}.xlsx`);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0f] text-white font-sans overflow-hidden">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-[#111114] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-7 h-7">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black">Q</div>
          </div>
          <span className="font-bold text-[15px] tracking-tight">Qwen AI Chat</span>
          <span className="hidden sm:block text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            {modelUrl ? "CUSTOM API" : "HF · unsloth/Qwen3.5-27B"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              >
                기록 {history.length}개
              </button>
              <button
                onClick={downloadExcel}
                className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all"
              >
                ↓ 엑셀
              </button>
            </>
          )}
          <button
            onClick={clearChat}
            className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            초기화
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-all ${
              showSettings
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="flex-shrink-0 bg-[#111114] border-b border-white/[0.07] px-5 py-4 flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[260px]">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 font-mono resize-none focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-3 min-w-[220px]">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                HuggingFace API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="hf_xxxxxxxxxxxx"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                Custom API URL (Vast.ai 등)
              </label>
              <input
                type="text"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                placeholder="https://xxx.vast.ai/v1/chat/completions"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                Model ID (Vast.ai 모델명)
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="Qwen/Qwen3.5-27B"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── History Panel ── */}
      {showHistory && (
        <div className="flex-shrink-0 bg-[#0f0f12] border-b border-white/[0.07] max-h-48 overflow-y-auto px-5 py-3">
          <p className="text-[10px] font-mono text-white/30 mb-2 uppercase tracking-widest">대화 기록</p>
          <div className="flex flex-col gap-1">
            {history.map((h, i) => (
              <div key={i} className="flex gap-3 text-[11px] font-mono text-white/50 border-b border-white/5 pb-1">
                <span className="text-white/20 w-4 flex-shrink-0">{i + 1}</span>
                <span className="flex-1 truncate text-white/70">{h.question}</span>
                <span className="text-white/30 flex-shrink-0">{h.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center opacity-40 select-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-3xl">
              💬
            </div>
            <div>
              <p className="text-lg font-bold">무엇이든 물어보세요</p>
              <p className="text-sm font-mono text-white/40 mt-1">질문하면 AI가 답변합니다</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5
              ${msg.role === "user"
                ? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                : "bg-white/10 border border-white/10 text-violet-300 font-mono"
              }`}
            >
              {msg.role === "user" ? "나" : "AI"}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                ${msg.role === "user"
                  ? "bg-violet-600/30 border border-violet-500/20 rounded-tr-sm text-white"
                  : "bg-white/[0.04] border border-white/[0.07] rounded-tl-sm text-white/90"
                }`}
            >
              {msg.content}
              {msg.role === "assistant" && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-white/[0.07] bg-[#111114]">
        <div className={`flex gap-2 items-end bg-white/5 border rounded-2xl px-4 py-3 transition-colors ${
          isStreaming ? "border-white/10" : "border-white/10 focus-within:border-violet-500/60"
        }`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="질문을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
            rows={1}
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/25 resize-none font-sans leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all text-sm
              ${isStreaming || !input.trim()
                ? "bg-white/10 text-white/20 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
              }`}
          >
            {isStreaming ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : "▶"}
          </button>
        </div>
        <p className="text-[10px] font-mono text-white/20 mt-2 text-center">
          {modelUrl ? `Custom: ${modelUrl.slice(0, 40)}...` : "HuggingFace · unsloth/Qwen3.5-27B"}
          {history.length > 0 && ` · 기록 ${history.length}개 · 엑셀 다운로드 가능`}
        </p>
      </div>
    </div>
  );
}
