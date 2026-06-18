const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  coinId: string;
  coinName: string;
  symbol: string;
}

const SYSTEM = `You are a senior crypto market analyst. Produce concise, factual, source-grounded analysis of a cryptocurrency using real-time web information.
Return STRICT JSON matching the provided schema. No prose outside JSON. No markdown fences.`;

const SCHEMA_PROMPT = (name: string, symbol: string) => `
Analyze the cryptocurrency "${name}" (symbol: ${symbol.toUpperCase()}).

Return JSON with this exact shape:
{
  "summary": "2-3 sentence neutral overview of what's happening with this coin RIGHT NOW",
  "sentiment": { "score": <number -100..100>, "label": "Bearish"|"Neutral"|"Bullish", "rationale": "1 sentence" },
  "news": [
    { "title": "...", "source": "Publication name", "url": "https://...", "published": "human readable date", "summary": "1-2 sentence takeaway" }
  ],
  "social": [
    { "platform": "Twitter/X"|"Reddit"|"YouTube"|"Telegram"|"Facebook"|"TikTok",
      "author": "@handle or community name",
      "url": "https://...",
      "snippet": "what they said (paraphrased, <= 220 chars)",
      "engagement": "approx likes/views/comments if known, else empty",
      "sentiment": "positive"|"neutral"|"negative" }
  ],
  "themes": ["short tag 1", "short tag 2", "short tag 3", "short tag 4"],
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opp 1", "opp 2"]
}

Rules:
- 5-7 news items from the LAST 14 DAYS, real, with working URLs from reputable sources (CoinDesk, Cointelegraph, The Block, Decrypt, Bloomberg, Reuters, etc.).
- 5-8 social posts across at least 3 different platforms (Twitter/X, Reddit, YouTube, Telegram, Facebook, TikTok). Use real, recent posts.
- Themes are short (1-3 words) trending topics.
- All URLs must be real and reachable. If unsure, omit the item.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { coinId, coinName, symbol } = (await req.json()) as Body;
    if (!coinId || !coinName || !symbol) {
      return new Response(JSON.stringify({ error: "Missing coinId, coinName or symbol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: SCHEMA_PROMPT(coinName, symbol) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please retry shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI request failed", details: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      // try to extract JSON from a code fence as fallback
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("coin-analysis error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
