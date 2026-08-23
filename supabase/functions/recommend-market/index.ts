import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { listSize, markets } = await req.json();
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ explanation: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = `A shopper has ${listSize} item(s) on their list. Here are the top candidate markets, ranked best first:
${JSON.stringify(markets, null, 2)}

Write ONE short, friendly sentence (max 25 words) explaining why the #1 market is the best pick, mentioning both price and distance trade-offs if relevant. No preamble, just the sentence. Do not invent numbers not present in the data.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        max_tokens: 100,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ explanation: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content?.trim() ?? null;

    return new Response(JSON.stringify({ explanation }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ explanation: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});