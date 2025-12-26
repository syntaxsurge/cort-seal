export type CortensorCompletionResponse = {
  output?: string;
  result?: unknown;
  [key: string]: unknown;
};

export class CortensorHttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, options: { status: number; body: string }) {
    super(message);
    this.name = "CortensorHttpError";
    this.status = options.status;
    this.body = options.body;
  }
}

