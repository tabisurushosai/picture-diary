import { getLocalDateKey, type DiaryAccessLevel } from "./diary";

export type PremiumState = {
  trialStartedDate: string | null;
  purchasedDate: string | null;
};

export type PremiumStatus = {
  accessLevel: DiaryAccessLevel;
  kind: "free" | "trial" | "premium";
  trialDaysRemaining: number;
};

export const premiumStorageKey = "premiumState";
export const trialLengthDays = 7;
export const stripeCheckoutUrl = "https://checkout.stripe.com/c/pay/picture-diary-premium";

export function createInitialPremiumState(): PremiumState {
  return {
    trialStartedDate: null,
    purchasedDate: null,
  };
}

export function normalizePremiumState(state: PremiumState | null): PremiumState {
  return {
    trialStartedDate: state?.trialStartedDate ?? null,
    purchasedDate: state?.purchasedDate ?? null,
  };
}

function getWholeDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();

  return Math.floor((end - start) / 86_400_000);
}

export function getPremiumStatus(state: PremiumState | null, date = getLocalDateKey()): PremiumStatus {
  const normalizedState = normalizePremiumState(state);

  if (normalizedState.purchasedDate) {
    return {
      accessLevel: "premium",
      kind: "premium",
      trialDaysRemaining: 0,
    };
  }

  if (normalizedState.trialStartedDate) {
    const trialAgeDays = getWholeDaysBetween(normalizedState.trialStartedDate, date);
    const trialDaysRemaining = Math.max(0, trialLengthDays - trialAgeDays);

    if (trialDaysRemaining > 0) {
      return {
        accessLevel: "premium",
        kind: "trial",
        trialDaysRemaining,
      };
    }
  }

  return {
    accessLevel: "free",
    kind: "free",
    trialDaysRemaining: 0,
  };
}

export function startTrial(state: PremiumState | null, date = getLocalDateKey()): PremiumState {
  const normalizedState = normalizePremiumState(state);

  return {
    ...normalizedState,
    trialStartedDate: normalizedState.trialStartedDate ?? date,
  };
}
