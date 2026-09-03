import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Mirrors the rules enforced by the change-password and user-create forms. */
export function passwordIssues(plain: string): string[] {
  const issues: string[] = [];
  if (plain.length < 10) issues.push("minLength");
  if (!/[a-z]/.test(plain)) issues.push("lowercase");
  if (!/[A-Z]/.test(plain)) issues.push("uppercase");
  if (!/[0-9]/.test(plain)) issues.push("digit");
  return issues;
}
