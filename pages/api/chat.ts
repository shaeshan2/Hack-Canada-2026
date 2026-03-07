import type { NextApiRequest, NextApiResponse } from "next";
import "../../lib/auth0-env";
import { auth0 } from "../../lib/auth0";
import { prisma } from "../../lib/prisma";
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-3-flash-preview";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const session = await auth0.getSession(req);
    if (!session?.user) {
        res.status(401).json({ error: "Sign in to chat with Deedy" });
        return;
    }

    const { message, history } = req.body ?? {};
    if (!message || typeof message !== "string" || message.trim().length === 0) {
        res.status(400).json({ error: "Message is required" });
        return;
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        res.status(500).json({ error: "AI chat is not configured" });
        return;
    }

    const ai = new GoogleGenAI({ apiKey: key });

    // ── Build listing context ──
    let listingContext = "No listings are currently available.";
    try {
        const listings = await prisma.listing.findMany({
            include: {
                seller: { select: { name: true, email: true } },
                photos: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        if (listings.length > 0) {
            listingContext = listings
                .map(
                    (l, i) =>
                        `${i + 1}. "${l.title}" — $${l.price.toLocaleString("en-CA")} CAD\n` +
                        `   Address: ${l.address}\n` +
                        `   Description: ${l.description}\n` +
                        `   Confidence Score: ${l.confidenceScore != null ? `${l.confidenceScore}/100` : "Pending"}\n` +
                        `   Seller: ${l.seller.name || "Unknown"}\n` +
                        `   Listed: ${l.createdAt.toISOString().split("T")[0]}` +
                        (l.sqft ? `\n   Size: ${l.sqft} sqft` : "") +
                        (l.bedrooms ? `\n   Bedrooms: ${l.bedrooms}` : ""),
                )
                .join("\n\n");
        }
    } catch {
        // DB error — continue without listings
    }

    const systemPrompt = `You are the official AI assistant for DeedScan — Canada's commission-free real estate marketplace.

Your tone consists of being highly professional, direct, and helpful. Do not be overly chatty or conversational. Keep answers concise.

## What You Know

### About DeedScan
- No-commission real estate marketplace for Canada
- Sellers list properties for free with QR codes for their yard signs
- Buyers browse, scan QR codes, and message sellers directly
- Zero agent commission — sellers keep 100% of their sale
- Every listing gets an AI fraud-confidence score (0-100)
- Sellers must verify identity: upload a government-issued ID + proof of property ownership
- AI verification (powered by Gemini) can auto-approve sellers with high confidence
- Real-time chat between buyers and sellers via Socket.io

### Verification Documents Required for Sellers
- **Government ID**: Driver's license, passport, or other government-issued photo ID
- **Proof of ownership**: Property deed, land title certificate, or mortgage statement
- Documents are analyzed by AI for legitimacy and name matching
- High-confidence submissions (≥80%) can be auto-approved

### Confidence Scores
- **85-100**: Verified ✓ — listing passed all fraud checks
- **60-84**: Moderate — some checks inconclusive, under review
- **0-59**: Low ⚠ — flagged for manual review, potential concerns
- Scores are calculated from: photo uniqueness, EXIF GPS matching, price sanity (AI), address verification

### Current Listings
${listingContext}

## Critical Directives
- If the user asks a question about something NOT explicitly covered in the context above, you MUST ONLY reply with: "I have no idea." Do not attempt to guess, hallucinate, or be helpful outside of your context.
- Keep answers professional, factual, and direct.
- Do not use markdown formatting (like **bold** or *italics* asterisks) in your responses. Output plain text.
- Do not use colloquialisms or attempt humor.
- Use CAD ($) for prices.`;

    // ── Build conversation for Gemini ──
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    // Add conversation history if provided
    if (Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
            if (msg.role === "user" || msg.role === "model") {
                contents.push({
                    role: msg.role,
                    parts: [{ text: String(msg.text) }],
                });
            }
        }
    }

    // Add current user message
    contents.push({
        role: "user",
        parts: [{ text: message.trim() }],
    });

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                systemInstruction: systemPrompt,
            },
        });

        const reply =
            response.text ??
            "Hmm, I'm at a loss for words — that's a first for me! Try asking again?";

        res.status(200).json({ reply });
    } catch (err) {
        console.error("Gemini chat failed:", err);
        res.status(500).json({
            reply: "Sorry eh, my brain is a bit foggy right now. Try again in a moment! 🍁",
        });
    }
}
