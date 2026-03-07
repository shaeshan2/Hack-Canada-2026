import type { NextApiRequest, NextApiResponse } from "next";
import "../../../../../lib/auth0-env";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { Role, VerificationStatus } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma";
import { requireAdminUser } from "../../../../../lib/admin-guard";
import { assignAuth0RoleToUser } from "../../../../../lib/auth0-management";
import { sendTransactionalEmail } from "../../../../../lib/notifications";

export default withApiAuthRequired(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const adminUser = await requireAdminUser(req, res);
  if (!adminUser) return;

  const submissionId = req.query.submissionId as string;
  const { decision, reason } = req.body ?? {};

  if (decision !== "approve" && decision !== "reject") {
    res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
    return;
  }
  if (decision === "reject" && !reason) {
    res.status(400).json({ error: "reason is required when rejecting" });
    return;
  }

  const submission = await prisma.sellerVerificationSubmission.findUnique({
    where: { id: submissionId },
    include: { user: true }
  });
  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  if (submission.status !== VerificationStatus.PENDING) {
    res.status(400).json({ error: "Submission is not pending" });
    return;
  }

  const reviewedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updatedSubmission = await tx.sellerVerificationSubmission.update({
      where: { id: submission.id },
      data: {
        status: decision === "approve" ? VerificationStatus.APPROVED : VerificationStatus.REJECTED,
        rejectionReason: decision === "reject" ? String(reason) : null,
        reviewedAt,
        reviewedById: adminUser.id
      }
    });

    const updatedUser = await tx.user.update({
      where: { id: submission.userId },
      data: {
        role: decision === "approve" ? Role.SELLER_VERIFIED : Role.SELLER_PENDING
      }
    });

    return { updatedSubmission, updatedUser };
  });

  let auth0RoleSync: { applied?: boolean; reason?: string } = {};
  if (decision === "approve") {
    try {
      auth0RoleSync = await assignAuth0RoleToUser(result.updatedUser.auth0Id, "seller_verified");
    } catch (error) {
      auth0RoleSync = { reason: (error as Error).message };
    }
  }

  let emailStatus: { delivered?: boolean; reason?: string } = {};
  try {
    emailStatus = await sendTransactionalEmail({
      to: result.updatedUser.email,
      subject:
        decision === "approve"
          ? "Your seller verification has been approved"
          : "Your seller verification was rejected",
      text:
        decision === "approve"
          ? "Your account is now seller_verified and you can create listings."
          : `Your verification was rejected. Reason: ${String(reason)}. You can re-upload documents from your dashboard.`
    });
  } catch (error) {
    emailStatus = { reason: (error as Error).message };
  }

  res.status(200).json({
    submission: result.updatedSubmission,
    user: { id: result.updatedUser.id, role: result.updatedUser.role },
    auth0RoleSync,
    emailStatus
  });
});
