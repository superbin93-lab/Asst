/**
 * Book-value helpers. Deliberately simple: SMEs track straight-line or reducing
 * balance from the purchase date, and finance exports the numbers monthly.
 */
export type DepreciationInput = {
  purchaseCost: number | null;
  purchaseDate: Date | null;
  usefulLifeMonths: number | null;
  salvageValue: number | null;
  method: "NONE" | "STRAIGHT_LINE" | "DECLINING_BALANCE";
  asOf?: Date;
};

export function monthsElapsed(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, to.getDate() >= from.getDate() ? months : months - 1);
}

export function bookValue(input: DepreciationInput): number | null {
  const { purchaseCost, purchaseDate, usefulLifeMonths, method } = input;
  if (purchaseCost === null || purchaseCost <= 0) return null;
  if (method === "NONE" || !purchaseDate || !usefulLifeMonths || usefulLifeMonths <= 0) {
    return purchaseCost;
  }

  const salvage = input.salvageValue ?? 0;
  const elapsed = Math.min(monthsElapsed(purchaseDate, input.asOf ?? new Date()), usefulLifeMonths);

  if (method === "STRAIGHT_LINE") {
    const monthly = (purchaseCost - salvage) / usefulLifeMonths;
    return Math.max(salvage, purchaseCost - monthly * elapsed);
  }

  // Double-declining balance, floored at the salvage value.
  const annualRate = (2 / (usefulLifeMonths / 12)) / 12;
  const value = purchaseCost * Math.pow(1 - annualRate, elapsed);
  return Math.max(salvage, value);
}

export function depreciationProgress(input: DepreciationInput): number | null {
  const { purchaseDate, usefulLifeMonths } = input;
  if (!purchaseDate || !usefulLifeMonths || usefulLifeMonths <= 0) return null;
  const elapsed = monthsElapsed(purchaseDate, input.asOf ?? new Date());
  return Math.min(1, elapsed / usefulLifeMonths);
}

export type WarrantyState = "active" | "expiring" | "expired" | "unknown";

export function warrantyState(warrantyEndAt: Date | null, alertDays = 30): { state: WarrantyState; days: number | null } {
  if (!warrantyEndAt) return { state: "unknown", days: null };
  const days = Math.ceil((warrantyEndAt.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { state: "expired", days };
  if (days <= alertDays) return { state: "expiring", days };
  return { state: "active", days };
}
