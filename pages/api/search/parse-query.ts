import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { config } from "../../../lib/config";

type ParsedQuery = {
  rawQuery: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number;
  price_min: number | null;
  price_max: number | null;
  bedrooms: number | null;
};

function parseIntLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
}

function parseFallbackQuery(rawQuery: string): Omit<ParsedQuery, "rawQuery" | "lat" | "lng"> {
  const q = rawQuery.toLowerCase();
  const bedMatch = q.match(/(\d+)\s*[- ]?\s*bed/);
  const underMatch = q.match(/under\s*\$?\s*([\d,.]+)\s*([mk])?/);
  const betweenMatch = q.match(/between\s*\$?\s*([\d,.]+)\s*([mk])?\s*and\s*\$?\s*([\d,.]+)\s*([mk])?/);
  const nearMatch = q.match(/near\s+([a-z\s]+)/);
  const inMatch = q.match(/in\s+([a-z\s]+)/);

  const applySuffix = (amount: string, suffix?: string) => {
    const base = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(base)) return null;
    if (suffix === "m") return Math.round(base * 1_000_000);
    if (suffix === "k") return Math.round(base * 1_000);
    return Math.round(base);
  };

  let priceMin: number | null = null;
  let priceMax: number | null = null;
  if (betweenMatch) {
    priceMin = applySuffix(betweenMatch[1], betweenMatch[2]);
    priceMax = applySuffix(betweenMatch[3], betweenMatch[4]);
  } else if (underMatch) {
    priceMax = applySuffix(underMatch[1], underMatch[2]);
  }

  const bedrooms = bedMatch ? Number(bedMatch[1]) : null;
  const locationText = (nearMatch?.[1] ?? inMatch?.[1] ?? null)?.trim() ?? null;

  return {
    locationText,
    radius_km: 10,
    price_min: priceMin,
    price_max: priceMax,
    bedrooms: Number.isFinite(bedrooms as number) ? bedrooms : null,
  };
}

async function geocodeLocation(locationText: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      `${locationText}, Canada`
    )}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "DeedScan/1.0" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function parseWithGemini(rawQuery: string): Promise<Omit<ParsedQuery, "rawQuery" | "lat" | "lng"> | null> {
  const apiKey = config.optional.geminiApiKey;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse this real estate search query into JSON.
Query: "${rawQuery}"

Return JSON only with exact shape:
{
  "locationText": string | null,
  "radius_km": number,
  "price_min": number | null,
  "price_max": number | null,
  "bedrooms": number | null
}

Rules:
- Use CAD numeric values.
- If query says "under $700k", set price_max=700000.
- If missing radius, default radius_km=10.
- Keep unknown fields null.`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      locationText:
        typeof parsed.locationText === "string" && parsed.locationText.trim()
          ? parsed.locationText.trim()
          : null,
      radius_km: Math.max(1, parseIntLike(parsed.radius_km) ?? 10),
      price_min: parseIntLike(parsed.price_min),
      price_max: parseIntLike(parsed.price_max),
      bedrooms: parseIntLike(parsed.bedrooms),
    };
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawQuery = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!rawQuery) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const parsedFromGemini = await parseWithGemini(rawQuery);
  const fallback = parseFallbackQuery(rawQuery);
  const merged = parsedFromGemini ?? fallback;

  let lat: number | null = null;
  let lng: number | null = null;
  if (merged.locationText) {
    const geocoded = await geocodeLocation(merged.locationText);
    if (geocoded) {
      lat = geocoded.lat;
      lng = geocoded.lng;
    }
  }

  const result: ParsedQuery = {
    rawQuery,
    locationText: merged.locationText,
    lat,
    lng,
    radius_km: merged.radius_km,
    price_min: merged.price_min,
    price_max: merged.price_max,
    bedrooms: merged.bedrooms,
  };

  res.status(200).json(result);
}
