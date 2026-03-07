import * as fs from "node:fs/promises";
import * as path from "node:path";

type VerificationResult = {
    approved: boolean;
    confidence: number;
    reason: string;
    extractedName?: string;
};

const GEMINI_MODEL = "gemini-3-flash-preview";

/**
 * Read a local upload URL (e.g. "/uploads/abc.jpg") into a base64 data string
 * suitable for Gemini Vision inline_data.
 */
async function readUploadAsBase64(url: string): Promise<{
    base64: string;
    mimeType: string;
} | null> {
    // Local uploads start with "/" and are under public/
    if (!url.startsWith("/")) return null;

    const absPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));

    try {
        const buffer = await fs.readFile(absPath);
        const base64 = buffer.toString("base64");

        const ext = path.extname(absPath).toLowerCase();
        const mimeMap: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".pdf": "application/pdf",
        };
        const mimeType = mimeMap[ext] ?? "image/jpeg";

        return { base64, mimeType };
    } catch {
        return null;
    }
}

/**
 * Use Gemini Vision to analyze seller verification documents.
 *
 * Sends both the government ID and ownership proof to Gemini and asks it
 * to determine authenticity + whether the names match.
 */
export async function verifyDocuments(
    govIdDocumentUrl: string,
    ownershipProofUrl: string,
): Promise<VerificationResult> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        return {
            approved: false,
            confidence: 0,
            reason: "GEMINI_API_KEY not configured — manual review required.",
        };
    }

    const govIdData = await readUploadAsBase64(govIdDocumentUrl);
    const ownershipData = await readUploadAsBase64(ownershipProofUrl);

    if (!govIdData || !ownershipData) {
        return {
            approved: false,
            confidence: 0,
            reason: "Could not read uploaded documents for AI analysis.",
        };
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `You are a document verification specialist for a real estate platform called DeedScan.

You are given TWO documents:
1. **Document 1 (Government-issued ID)** — should be a driver's license, passport, or similar government ID.
2. **Document 2 (Proof of property ownership)** — should be a property deed, land title, mortgage statement, or similar ownership document.

Analyze both documents and determine:
- Is Document 1 a real, valid government-issued photo ID? (not a screenshot of a screen, not obviously edited)
- Is Document 2 a legitimate property ownership document?
- Do the names on both documents appear to match (same person)?
- Are there any red flags suggesting fraud or forgery?

Return JSON only with this exact shape:
{
  "approved": true/false,
  "confidence": 0-100,
  "reason": "Brief explanation of your decision",
  "extractedName": "Name found on the government ID"
}

Rules:
- Set approved=true only if BOTH documents look legitimate AND names match
- confidence should reflect how certain you are (85+ means high confidence)
- If documents are clearly photos of real documents, be generous
- If either document is illegible, blurry, or clearly fake, set approved=false
- Be practical — this is for a hackathon real estate platform, not a bank`,
                                },
                                {
                                    inline_data: {
                                        mime_type: govIdData.mimeType,
                                        data: govIdData.base64,
                                    },
                                },
                                {
                                    inline_data: {
                                        mime_type: ownershipData.mimeType,
                                        data: ownershipData.base64,
                                    },
                                },
                            ],
                        },
                    ],
                    generationConfig: { responseMimeType: "application/json" },
                }),
            },
        );

        if (!response.ok) {
            const errText = await response.text().catch(() => "");
            console.error("Gemini verification API error:", response.status, errText);
            return {
                approved: false,
                confidence: 0,
                reason: `AI verification unavailable (API error ${response.status}). Manual review required.`,
            };
        }

        const data = await response.json();
        const text: string | undefined =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return {
                approved: false,
                confidence: 0,
                reason: "AI returned empty response. Manual review required.",
            };
        }

        const parsed = JSON.parse(text) as {
            approved?: boolean;
            confidence?: number;
            reason?: string;
            extractedName?: string;
        };

        return {
            approved: parsed.approved === true,
            confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 0))),
            reason: parsed.reason ?? "No reason provided.",
            extractedName: parsed.extractedName ?? undefined,
        };
    } catch (err) {
        console.error("Gemini document verification failed:", err);
        return {
            approved: false,
            confidence: 0,
            reason: "AI verification encountered an error. Manual review required.",
        };
    }
}
