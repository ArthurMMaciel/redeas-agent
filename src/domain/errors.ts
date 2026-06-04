export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class UsageLimitExceededError extends DomainError {
  constructor(limit: number) {
    super(`Free plan daily transaction limit exceeded: ${limit}`);
    this.name = "UsageLimitExceededError";
  }
}

