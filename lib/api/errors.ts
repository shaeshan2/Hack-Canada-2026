import type { NextApiResponse } from "next";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

const statusByCode: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
};

export function sendError(
  res: NextApiResponse,
  message: string,
  code: ApiErrorCode = "BAD_REQUEST",
  status?: number
) {
  const s = status ?? statusByCode[code];
  res.status(s).json({ error: message, code });
}

export function sendNotFound(res: NextApiResponse, resource = "Resource") {
  sendError(res, `${resource} not found`, "NOT_FOUND");
}

export function sendValidation(res: NextApiResponse, message: string) {
  sendError(res, message, "VALIDATION_ERROR");
}
