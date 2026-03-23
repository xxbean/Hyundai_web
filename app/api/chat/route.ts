import { NextRequest } from "next/server";
 
export const runtime = "edge";
 
export async function POST(req: NextRequest) {
  const { messages, systemPrompt, modelUrl, apiKey } = await req.json();
 
  // 기본값: HuggingFace Inference API (unsloth/Qwen3.5-27B)
  // Vast.ai 쓸 때는 프론트에서 modelUrl 넘겨주면 됨
  const HF_MODEL = "unsloth/Qwen3.5-27B";
  const endpoint =
    modelUrl ||
    `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/v1/chat/completions`;
 
  const hfKey = apiKey || process.env.HF_API_KEY || "";
 
  const body = {
    model: HF_MODEL,
    messages: [
      ...(systemPrompt
        ? [{ role: "system", content: systemPrompt }]
        : []),
      ...messages,
    ],
    stream: true,
    max_tokens: 2048,
    temperature: 0.7,
  };
 
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(hfKey ? { Authorization: `Bearer ${hfKey}` } : {}),
    },
    body: JSON.stringify(body),
  });
 
  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(JSON.stringify({ error: err }), { status: upstream.status });
  }
 
  // SSE 스트림 그대로 프록시
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
