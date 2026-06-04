import { describe, expect, it } from "vitest";
import { UsageLimitExceededError } from "../errors.js";
import { assertCanCreateTransaction } from "./usage-policy.js";

describe("assertCanCreateTransaction", () => {
  it("blocks free users after five daily transactions", () => {
    expect(() =>
      assertCanCreateTransaction({
        subscriptionStatus: "free",
        transactionsCreatedToday: 5
      })
    ).toThrow(UsageLimitExceededError);
  });

  it("does not block active subscribers", () => {
    expect(() =>
      assertCanCreateTransaction({
        subscriptionStatus: "active",
        transactionsCreatedToday: 99
      })
    ).not.toThrow();
  });
});

