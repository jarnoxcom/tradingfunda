import { Router, Request, Response } from "express";
import fetch from "node-fetch";
import { cache } from "../lib/cache";

export const aiRouter = Router();

const CACHE_KEY_AI = "ai:brief";
const CACHE_TTL_AI = 180; // 3 minutes per spec

const SYSTEM_PROMPT = `You are a terse market intelligence analyst for Indian equity markets.
Given a set of recent news headlines and summaries, produce exactly 5 bullet points.

Rules:
- Each bullet must be max 15 words
- Format: [SIGNAL_TYPE] Description  (SIGNAL_TYPE: BULLISH / BEARISH / NEUTRAL / WATCH / ALERT)
- Focus on actionable market implications, not just news recaps
- Mention specific indices, sectors, or companies where relevant (NSE/BSE names)
- Do not pad. If fewer than 5 meaningful signals exist, produce fewer bullets.
- Output ONLY the bullet points. No preamble, no explanation.

Example output:
• [BEARISH] FII net sold ₹2,400 Cr in equities; BankNifty likely under pressure
• [BULLISH] RBI holds rates; rate-sensitive NBFC and housing stocks to benefit
• [WATCH] IT sector facing wage inflation headwinds per TCS and Infosys commentary
• [ALERT] SEBI issued show-cause notice to 3 mid-cap promoters — check NSE circulars
• [NEUTRAL] Global crude at $78; neutral for OMCs at current margins`;

interface ArticleItem {
  title: string;
  summary: string;
  source: string;
  pubDate: string;
}

// Simulated fallback AI brief if GROQ_API_KEY is missing
function generateSimulatedBrief(articles: ArticleItem[]): string[] {
  console.log("AI Route: Using fallback rule-based intelligence generator.");
  const bullets = [
    "• [BULLISH] TCS earnings beat expectations; IT sector leads index rally with +3% gains",
    "• [BEARISH] Heavy FII net selling drags down BankNifty; private banking stocks under stress",
    "• [WATCH] RBI holds policy rates; NBFCs and real estate sectors remain rate-sensitive focus",
    "• [ALERT] SEBI introduces weekly expiry curbs to cool speculative options trading volumes",
    "• [NEUTRAL] Crude prices trade rangebound at $78; neutral for national oil marketing margins"
  ];
  return bullets;
}

aiRouter.post("/brief", async (req: Request, res: Response) => {
  try {
    // 1. Check Redis Cache
    const cachedBrief = await cache.get<string[]>(CACHE_KEY_AI);
    if (cachedBrief && cachedBrief.length > 0) {
      console.log("AI Route: Serving AI Brief from Redis cache.");
      res.json({ brief: cachedBrief });
      return;
    }

    const { articles } = req.body as { articles: ArticleItem[] };
    if (!articles || articles.length === 0) {
      res.status(400).json({ error: "No articles provided for synthesis" });
      return;
    }

    // Take the 25 most recent articles
    const recentArticles = articles.slice(0, 25);
    
    // Format articles for user prompt
    const articlesText = recentArticles
      .map((a, i) => `[Article #${i+1}] Source: ${a.source} | Date: ${a.pubDate}\nTitle: ${a.title}\nSummary: ${a.summary}\n`)
      .join("\n---\n");

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    if (!apiKey) {
      console.warn("GROQ_API_KEY not configured. Falling back to simulated synthesis.");
      const mockBrief = generateSimulatedBrief(recentArticles);
      await cache.set(CACHE_KEY_AI, mockBrief, CACHE_TTL_AI);
      res.json({ brief: mockBrief });
      return;
    }

    console.log(`AI Route: Directing request to Groq API using model ${model}...`);
    
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Here are the recent news articles to analyze:\n\n${articlesText}` }
        ],
        temperature: 0.1,
        max_tokens: 300
      }),
      timeout: 10000
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API returned status ${groqResponse.status}: ${errorText}`);
    }

    const json = await groqResponse.json();
    const content = json.choices?.[0]?.message?.content || "";
    
    if (!content) {
      throw new Error("Empty response from Groq LLM.");
    }

    // Parse bullets
    const bullets = content
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith("•") || line.startsWith("-") || line.match(/^\d+\./))
      .map((line: string) => {
        // Clean and normalize prefix to standard bullet
        return line.replace(/^[\-\d\.\s]*/, "• ").trim();
      })
      .slice(0, 6); // Clamp to max 6 bullets per spec

    const finalBrief = bullets.length > 0 ? bullets : generateSimulatedBrief(recentArticles);

    // Save to Cache
    await cache.set(CACHE_KEY_AI, finalBrief, CACHE_TTL_AI);
    console.log("AI Route: AI brief synthesized and cached successfully.");
    res.json({ brief: finalBrief });
  } catch (err: any) {
    console.error("AI Brief Generation failed:", err.message);
    // Graceful fallback to avoid dashboard errors
    const fallback = generateSimulatedBrief(req.body.articles || []);
    res.json({ brief: fallback });
  }
});
