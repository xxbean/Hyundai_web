import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, modelUrl, modelId, apiKey } = await req.json();

  const HF_MODEL = "Qwen/Qwen2.5-7B-Instruct";
  const hfKey = apiKey || process.env.HF_API_KEY || "";

  // endpoint: custom URL 있으면 그거, 없으면 HF router
  const endpoint =
    modelUrl ||
    `https://router.huggingface.co/hf-inference/v1/chat/completions`;

  const model = modelId || HF_MODEL;

  const body = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
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

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

