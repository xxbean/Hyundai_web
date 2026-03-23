import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, modelUrl, modelId, apiKey } = await req.json();

  const HF_MODEL = "Qwen/Qwen2.5-7B-Instruct";

  // endpoint: Vast.ai 등 custom URL이 있으면 그걸 쓰고, 없으면 HF
  const endpoint =
    modelUrl ||
    `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/v1/chat/completions`;

  // model 필드: custom이 있으면 그걸 쓰고, 없으면 HF 모델명
  const model = modelId || HF_MODEL;

  const hfKey = apiKey || process.env.HF_API_KEY || "";

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
