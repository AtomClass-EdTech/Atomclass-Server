export class DeviceLimitExceededError extends Error {
  constructor(limit: number) {
    super(
      `Maximum of ${limit} devices already signed in. Please sign out from another device before trying again.`,
    );
    this.name = "DeviceLimitExceededError";
  }
}
