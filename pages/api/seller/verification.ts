import type { NextApiRequest, NextApiResponse } from "next";
import "../../../lib/auth0-env";
import { Role, VerificationStatus } from "@prisma/client";
import { auth0 } from "../../../lib/auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";
import { verifyDocuments } from "../../../lib/api/verify-documents";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return auth0.withApiAuthRequired(async function protectedHandler(
    protectedReq: NextApiRequest,
    protectedRes: NextApiResponse
  ) {
    const session = await auth0.getSession(protectedReq);
    if (!session?.user) {
      protectedRes.status(401).json({ error: "Not authenticated" });
      return;
    }

    const signupRole = getSignupIntentRole(protectedReq);
    const dbUser = await ensureDbUser(session.user, signupRole);

    if (protectedReq.method === "GET") {
      const latest = await prisma.sellerVerificationSubmission.findFirst({
        where: { userId: dbUser.id },
        orderBy: { submittedAt: "desc" }
      });
      protectedRes.status(200).json({
        role: dbUser.role,
        submission: latest
      });
      return;
    }

    if (protectedReq.method === "POST") {
      if (dbUser.role !== Role.SELLER_PENDING && dbUser.role !== Role.SELLER_VERIFIED) {
        protectedRes.status(403).json({ error: "Only seller accounts can submit verification documents" });
        return;
      }

      const { govIdDocumentUrl, ownershipProofUrl } = protectedReq.body ?? {};
      if (!govIdDocumentUrl || !ownershipProofUrl) {
        protectedRes.status(400).json({ error: "govIdDocumentUrl and ownershipProofUrl are required" });
        return;
      }

      const existingPending = await prisma.sellerVerificationSubmission.findFirst({
        where: { userId: dbUser.id, status: VerificationStatus.PENDING },
        orderBy: { submittedAt: "desc" }
      });

      const submission = existingPending
        ? await prisma.sellerVerificationSubmission.update({
          where: { id: existingPending.id },
          data: {
            govIdDocumentUrl: String(govIdDocumentUrl),
            ownershipProofUrl: String(ownershipProofUrl),
            submittedAt: new Date(),
            rejectionReason: null,
            aiAnalysis: null,
            aiConfidence: null,
            reviewedAt: null,
            reviewedById: null
          }
        })
        : await prisma.sellerVerificationSubmission.create({
          data: {
            userId: dbUser.id,
            govIdDocumentUrl: String(govIdDocumentUrl),
            ownershipProofUrl: String(ownershipProofUrl)
          }
        });

      if (dbUser.role !== Role.SELLER_PENDING) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role: Role.SELLER_PENDING }
        });
      }

      // ── Run Gemini AI document verification ──
      const aiResult = await verifyDocuments(
        String(govIdDocumentUrl),
        String(ownershipProofUrl)
      );

      // Store AI analysis on the submission
      const updatedSubmission = await prisma.sellerVerificationSubmission.update({
        where: { id: submission.id },
        data: {
          aiAnalysis: aiResult.reason,
          aiConfidence: aiResult.confidence,
          // Auto-approve if AI is confident
          ...(aiResult.approved && aiResult.confidence >= 80
            ? {
              status: VerificationStatus.APPROVED,
              reviewedAt: new Date(),
            }
            : {}),
        },
      });

      // If AI auto-approved, upgrade the user role
      if (aiResult.approved && aiResult.confidence >= 80) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role: Role.SELLER_VERIFIED },
        });
      }

      protectedRes.status(201).json({
        ...updatedSubmission,
        aiVerification: {
          approved: aiResult.approved,
          confidence: aiResult.confidence,
          reason: aiResult.reason,
          extractedName: aiResult.extractedName,
        },
      });
      return;
    }

    protectedRes.setHeader("Allow", "GET, POST");
    protectedRes.status(405).json({ error: "Method not allowed" });
  })(req, res);
}
