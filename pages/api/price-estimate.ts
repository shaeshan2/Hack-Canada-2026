import type { NextApiRequest, NextApiResponse } from "next";
import { parseBody, priceEstimateSchema } from "../../lib/api/validation";
import { sendError, sendValidation } from "../../lib/api/errors";
import { config } from "../../lib/config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  const parsed = parseBody(priceEstimateSchema, req.body);
  if (!parsed.success) {
    sendValidation(res, parsed.error);
    return;
  }
  const { address, sqft, bedrooms } = parsed.data;

  const apiKey = config.optional.geminiApiKey;
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a real estate analyst. Given this property:
- Address: ${address}
- Size: ${sqft} sqft
- Bedrooms: ${bedrooms}

Search recent sold prices within 1km, check school ratings, transit scores, and suggest a fair listing price range with reasoning.

Return JSON only with this exact shape:
{ "price_range": "$650,000 - $720,000", "explanation": "..." }`,
                  },
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || response.statusText);
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsedJson = JSON.parse(text) as { price_range?: string; explanation?: string };
        res.status(200).json({
          price_range: parsedJson.price_range ?? "$500,000 - $750,000",
          explanation: parsedJson.explanation ?? "AI-generated estimate based on local market data and amenities.",
        });
        return;
      }
    } catch (e) {
      console.error("Gemini price-estimate error:", e);
    }
  }

  const base = 500000 + (bedrooms || 2) * 80000 + (sqft || 1000) * 200;
  const low = Math.round((base * 0.9) / 1000) * 1000;
  const high = Math.round((base * 1.15) / 1000) * 1000;
  res.status(200).json({
    price_range: `$${low.toLocaleString("en-CA")} - $${high.toLocaleString("en-CA")}`,
    explanation:
      "Estimated range in CAD (mock). Set GEMINI_API_KEY for AI-powered analysis.",
  });
}
