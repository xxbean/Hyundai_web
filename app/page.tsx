"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

interface Message {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
}

interface HistoryRow {
  question: string;
  answer: string;
  timestamp: string;
}

export default function Home() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory]         = useState<HistoryRow[]>([]);

  // Settings
  const [systemPrompt, setSystemPrompt] = useState("당신은 현대자동차 품질안전 전문 AI 어시스턴트입니다. 정확하고 전문적으로 답변해주세요.");
  const [vastApiKey, setVastApiKey]     = useState("");
  const [endpointId, setEndpointId]     = useState("HYUNDAI-CHAT-A100");
  const [modelId, setModelId]           = useState("mlaipublic/gpt-oss-sft-2-keep");
  const [maxTokens, setMaxTokens]       = useState(2048);
  const [temperature, setTemperature]   = useState(0.7);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt,
          apiKey: vastApiKey,
          endpointId,
          modelId,
          maxTokens,
          temperature,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `❌ 오류: ${data.error}` }]);
        return;
      }

      const aiMsg: Message = { role: "assistant", content: data.content, reasoning: data.reasoning };
      setMessages(prev => [...prev, aiMsg]);
      setHistory(prev => [...prev, {
        question: userMsg.content,
        answer: data.content,
        timestamp: new Date().toLocaleString("ko-KR"),
      }]);

    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ 오류: ${String(e)}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, systemPrompt, vastApiKey, endpointId, modelId, maxTokens, temperature, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const downloadExcel = () => {
    if (!history.length) return;
    const ws = XLSX.utils.json_to_sheet(history.map(h => ({ 질문: h.question, 답변: h.answer, 시간: h.timestamp })));
    ws["!cols"] = [{ wch: 50 }, { wch: 80 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "대화기록");
    XLSX.writeFile(wb, `AI_대화기록_${new Date().toLocaleDateString("ko-KR")}.xlsx`);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0f] text-white overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-[#111114] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-black text-xs">Q</div>
          <span className="font-bold text-[15px] tracking-tight">Hyundai AI Chat</span>
          <span className="hidden sm:block text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            Vast.ai · {endpointId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button onClick={downloadExcel}
              className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all">
              ↓ 엑셀 ({history.length}개)
            </button>
          )}
          <button onClick={() => { setMessages([]); }}
            className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all">
            초기화
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-all ${showSettings ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-white/10 bg-white/5 text-white/50 hover:text-white"}`}>
            ⚙
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="flex-shrink-0 bg-[#111114] border-b border-white/[0.07] px-5 py-4 flex flex-wrap gap-4">

          {/* System Prompt */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[260px]">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">System Prompt</label>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={3}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 font-mono resize-none focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          {/* Vast Settings */}
          <div className="flex flex-col gap-3 min-w-[220px]">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Vast API Key</label>
              <input type="password" value={vastApiKey} onChange={e => setVastApiKey(e.target.value)}
                placeholder="비어있으면 서버 env 사용"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Endpoint ID</label>
              <input type="text" value={endpointId} onChange={e => setEndpointId(e.target.value)}
                placeholder="HYUNDAI-CHAT-A100"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Model ID</label>
              <input type="text" value={modelId} onChange={e => setModelId(e.target.value)}
                placeholder="mlaipublic/gpt-oss-sft-2-keep"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>

          {/* Params */}
          <div className="flex flex-col gap-3 min-w-[160px]">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Max Tokens</label>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} min={64} max={8192}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Temperature <span className="text-violet-400">{temperature}</span></label>
              <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(Number(e.target.value))}
                className="accent-violet-500" />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center opacity-40 select-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-3xl">💬</div>
            <div>
              <p className="text-lg font-bold">무엇이든 물어보세요</p>
              <p className="text-sm font-mono text-white/40 mt-1">Vast.ai · {endpointId}</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5
              ${msg.role === "user" ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" : "bg-white/10 border border-white/10 text-violet-300 font-mono"}`}>
              {msg.role === "user" ? "나" : "AI"}
            </div>
            <div className={`max-w-[75%] flex flex-col gap-2`}>
              {msg.reasoning && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs font-mono text-amber-300/70 whitespace-pre-wrap">
                  <span className="text-amber-400/50 block mb-1 text-[10px] uppercase tracking-widest">reasoning</span>
                  {msg.reasoning}
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                ${msg.role === "user"
                  ? "bg-violet-600/30 border border-violet-500/20 rounded-tr-sm text-white"
                  : "bg-white/[0.04] border border-white/[0.07] rounded-tl-sm text-white/90"}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex-shrink-0 bg-white/10 border border-white/10 flex items-center justify-center text-xs font-mono text-violet-300">AI</div>
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:"0ms"}}/>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:"150ms"}}/>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:"300ms"}}/>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-white/[0.07] bg-[#111114]">
        <div className={`flex gap-2 items-end bg-white/5 border rounded-2xl px-4 py-3 transition-colors ${isLoading ? "border-white/10" : "border-white/10 focus-within:border-violet-500/60"}`}>
          <textarea ref={textareaRef} value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="질문을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
            rows={1}
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/25 resize-none font-sans leading-relaxed" />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all text-sm
              ${isLoading || !input.trim() ? "bg-white/10 text-white/20 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"}`}>
            {isLoading
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : "▶"}
          </button>
        </div>
        <p className="text-[10px] font-mono text-white/20 mt-2 text-center">
          Vast.ai · {endpointId} · {modelId}
          {history.length > 0 && ` · 기록 ${history.length}개`}
        </p>
      </div>
    </div>
  );
}
