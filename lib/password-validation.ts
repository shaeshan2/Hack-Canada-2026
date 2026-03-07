/**
 * Password validation rules:
 * - 8+ characters
 * - At least 1 lowercase
 * - At least 1 uppercase
 * - At least 1 number
 * - At least 1 special character
 */
const MIN_LENGTH = 8;
const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;
const SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < MIN_LENGTH) {
    errors.push(`At least ${MIN_LENGTH} characters required`);
  }
  if (!LOWER.test(password)) {
    errors.push("At least one lowercase letter required");
  }
  if (!UPPER.test(password)) {
    errors.push("At least one uppercase letter required");
  }
  if (!DIGIT.test(password)) {
    errors.push("At least one number required");
  }
  if (!SPECIAL.test(password)) {
    errors.push("At least one special character required (!@#$%^&* etc.)");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
