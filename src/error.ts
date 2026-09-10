/** Error codes: what `lifehash` rejects. */
export const LifeHashErrorCode = {
  /** `moduleSize` is not a positive integer. */
  InvalidModuleSize: "InvalidModuleSize",
  /** A digest that is not 32 bytes. */
  InvalidDigestLength: "InvalidDigestLength",
} as const;

/** One of the `LifeHashErrorCode` values. */
export type LifeHashErrorCode = (typeof LifeHashErrorCode)[keyof typeof LifeHashErrorCode];

/** Thrown for inputs `lifehash` cannot render. */
export class LifeHashError extends Error {
  readonly code: LifeHashErrorCode;

  constructor(code: LifeHashErrorCode, message: string) {
    super(message);
    this.name = "LifeHashError";
    this.code = code;
  }

  static isLifeHashError(e: unknown): e is LifeHashError {
    return e instanceof LifeHashError;
  }

  static invalidModuleSize(moduleSize: number): LifeHashError {
    return new LifeHashError(
      "InvalidModuleSize",
      `moduleSize must be a positive integer, got ${moduleSize}`,
    );
  }

  static invalidDigestLength(length: number): LifeHashError {
    return new LifeHashError("InvalidDigestLength", `digest must be 32 bytes, got ${length}`);
  }
}
