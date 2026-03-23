import { NextRequest } from "next/server";

export const runtime = "edge";

const DEFAULT_ENDPOINT = "HYUNDAI-CHAT-A100";
const DEFAULT_MODEL    = "Qwen/Qwen3.5-27B";
const ROUTE_URL        = "https://run.vast.ai/route/";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, apiKey, endpointId, modelId, maxTokens, temperature } = await req.json();

  const vastKey  = apiKey     || process.env.VAST_API_KEY || "";
  const endpoint = endpointId || DEFAULT_ENDPOINT;
  const model    = modelId    || DEFAULT_MODEL;
  const tokens   = maxTokens  || 2048;
  const temp     = temperature ?? 0.7;

  const allMessages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...messages,
  ];

  const payload = {
    model,
    messages: allMessages,
    max_tokens: tokens,
    temperature: temp,
    top_p: 0.9,
    repetition_penalty: 1.0,
  };

  // Step 1: route → worker URL + auth
  let routeJson: any;
  try {
    const routeResp = await fetch(ROUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(vastKey ? { Authorization: `Bearer ${vastKey}` } : {}),
      },
      body: JSON.stringify({ endpoint, cost: tokens }),
    });
    const routeText = await routeResp.text();
    if (!routeResp.ok) {
      return new Response(JSON.stringify({ error: `route 실패 (${routeResp.status}): ${routeText}` }), { status: 500 });
    }
    routeJson = JSON.parse(routeText);
  } catch (e) {
    return new Response(JSON.stringify({ error: `route 요청 오류: ${String(e)}` }), { status: 500 });
  }

  if (!routeJson.url || !routeJson.signature || routeJson.reqnum === undefined) {
    return new Response(JSON.stringify({ error: `worker 라우팅 실패: ${JSON.stringify(routeJson)}` }), { status: 500 });
  }

  // Step 2: worker 호출
  const workerUrl = routeJson.url.replace(/\/+$/, "") + "/v1/chat/completions";
  const workerBody = {
    auth_data: {
      signature:   routeJson.signature,
      cost:        routeJson.cost,
      endpoint:    routeJson.endpoint || endpoint,
      reqnum:      routeJson.reqnum,
      url:         routeJson.url,
      request_idx: routeJson.request_idx,
    },
    payload,
  };

  try {
    const workerResp = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(workerBody),
    });
    const workerText = await workerResp.text();
    if (!workerResp.ok) {
      return new Response(JSON.stringify({ error: `worker 실패 (${workerResp.status}): ${workerText}` }), { status: 500 });
    }

    const result = JSON.parse(workerText);
    const msg = result?.choices?.[0]?.message || {};
    return new Response(
      JSON.stringify({ content: msg.content || "", reasoning: msg.reasoning_content || "" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: `worker 요청 오류: ${String(e)}` }), { status: 500 });
  }
}
