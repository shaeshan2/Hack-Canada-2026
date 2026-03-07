import type { NextApiRequest, NextApiResponse } from "next";

type PriceEstimateBody = {
  address?: string;
  sqft?: number;
  bedrooms?: number;
};

/**
 * POST /api/price-estimate
 * Returns AI-powered (or mock) price range for a property.
 * Input: { address, sqft, bedrooms }
 * Uses Gemini when GEMINI_API_KEY is set; otherwise returns a mock range.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as PriceEstimateBody;
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const sqft = typeof body.sqft === "number" ? body.sqft : Number(body.sqft) || 0;
  const bedrooms = typeof body.bedrooms === "number" ? body.bedrooms : Number(body.bedrooms) || 0;

  if (!address) {
    res.status(400).json({ error: "address is required" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a real estate analyst for Canadian markets. Given this property:
- Address: ${address}
- Size: ${sqft} sqft
- Bedrooms: ${bedrooms}

Search recent sold prices within 1km, school ratings, transit, and suggest a fair listing price range in CAD with brief reasoning. Reply in JSON only: { "price_range": "$X - $Y", "explanation": "..." }`
              }]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || response.statusText);
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text) as { price_range?: string; explanation?: string };
        res.status(200).json({
          price_range: parsed.price_range ?? "$500,000 - $750,000",
          explanation: parsed.explanation ?? "AI-generated estimate based on local market."
        });
        return;
      }
    } catch (e) {
      console.error("Gemini price-estimate error:", e);
    }
  }

  // Mock response when no Gemini key or on error
  const base = 500000 + (bedrooms || 2) * 80000 + (sqft || 1000) * 200;
  const low = Math.round(base * 0.9 / 1000) * 1000;
  const high = Math.round(base * 1.15 / 1000) * 1000;
  res.status(200).json({
    price_range: `$${low.toLocaleString("en-CA")} - $${high.toLocaleString("en-CA")}`,
    explanation: "Estimated range based on bedrooms and sqft (mock). Add GEMINI_API_KEY for AI-powered analysis."
  });
}
