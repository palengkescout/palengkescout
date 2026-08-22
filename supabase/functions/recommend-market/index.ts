// Supabase Edge Function — deploy with:
//   supabase functions deploy recommend-market
// Then set the secret once (never commit the real key anywhere):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// This keeps the API key server-side only; the client never sees it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { listSize, markets } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ explanation: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = `A shopper has ${listSize} item(s) on their list. Here are the top candidate markets, ranked best first:
${JSON.stringify(markets, null, 2)}

Write ONE short, friendly sentence (max 25 words) explaining why the #1 market is the best pick, mentioning both price and distance trade-offs if relevant. No preamble, just the sentence.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ explanation: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const explanation = data.content?.find((c: any) => c.type === "text")?.text?.trim() ?? null;

    return new Response(JSON.stringify({ explanation }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ explanation: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});