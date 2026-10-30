export type PlanCode = 'monthly' | 'quarterly' | 'yearly';

export const PLANS: Record<PlanCode, { price: number; months: number }> = {
  monthly: { price: 150, months: 1 },
  quarterly: { price: 300, months: 3 },
  yearly: { price: 1000, months: 12 },
};

export function calculateEndDate(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}
