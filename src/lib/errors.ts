export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function createErrorResponse(message: string) {
  return {
    success: false,
    error: message,
  };
}
