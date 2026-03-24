export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest } from "next/server";

const DEFAULT_ENDPOINT = "Hyundai-Web";
const DEFAULT_MODEL = "Qwen/Qwen3.5-9B";
const ROUTE_URL = "https://run.vast.ai/route/";

export async function POST(req: NextRequest) {
  const {
    messages = [],
    systemPrompt,
    apiKey,
    endpointId,
    modelId,
    maxTokens,
    temperature,
  } = await req.json();

  const vastKey = apiKey || process.env.VAST_API_KEY || "";
  const endpoint = endpointId || DEFAULT_ENDPOINT;
  const model = modelId || DEFAULT_MODEL;
  const tokens = Number(maxTokens || 1024);
  const temp = temperature ?? 0.7;

  // Vast vLLM chat docs 기준: content는 string 권장
  const allMessages = [
    ...(systemPrompt
      ? [{ role: "system", content: String(systemPrompt) }]
      : []),
    ...messages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : String(m.content ?? ""),
    })),
  ];

  const payload = {
    model,
    messages: allMessages,
    max_tokens: tokens,
    temperature: temp,
    top_p: 0.9,
    stream: false,
  };

  let routeJson: any;

  try {
    const routeResp = await fetch(ROUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(vastKey ? { Authorization: `Bearer ${vastKey}` } : {}),
      },
      body: JSON.stringify({
        endpoint,
        cost: tokens,
      }),
    });

    const routeText = await routeResp.text();
    console.log("route status:", routeResp.status);
    console.log("route response:", routeText);

    if (!routeResp.ok) {
      return new Response(
        JSON.stringify({ error: `route 실패 (${routeResp.status}): ${routeText}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    routeJson = JSON.parse(routeText);
  } catch (e: any) {
    console.error("route fetch error:", e);
    return new Response(
      JSON.stringify({
        error: `route 요청 오류: ${String(e)}`,
        cause: e?.cause ? String(e.cause) : null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!routeJson?.url || !routeJson?.signature || routeJson?.reqnum === undefined) {
    return new Response(
      JSON.stringify({ error: `worker 라우팅 실패: ${JSON.stringify(routeJson)}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const workerUrl = routeJson.url.replace(/\/+$/, "") + "/v1/chat/completions";

  const workerBody = {
    auth_data: {
      signature: routeJson.signature,
      cost: routeJson.cost,
      endpoint: routeJson.endpoint || endpoint,
      reqnum: routeJson.reqnum,
      url: routeJson.url,
      request_idx: routeJson.request_idx,
    },
    payload,
  };

  try {
    console.log("workerUrl:", workerUrl);
    console.log("workerBody:", JSON.stringify(workerBody));

    const workerResp = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(workerBody),
    });

    const workerText = await workerResp.text();
    console.log("worker status:", workerResp.status);
    console.log("worker response:", workerText);

    if (!workerResp.ok) {
      return new Response(
        JSON.stringify({ error: `worker 실패 (${workerResp.status}): ${workerText}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(workerText);
    const msg = result?.choices?.[0]?.message || {};

    return new Response(
      JSON.stringify({
        content: msg.content || "",
        reasoning: msg.reasoning_content || "",
        raw: result,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("worker fetch error:", e);
    return new Response(
      JSON.stringify({
        error: `worker 요청 오류: ${String(e)}`,
        cause: e?.cause ? String(e.cause) : null,
        workerUrl,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
