/**
 * The single error type thrown by this package.
 *
 * The reference has no error type: its failures are `assert!` panics on a
 * digest that is not 32 bytes and on a module size of zero. The port throws
 * {@link LifeHashError} at those points and for every input only JavaScript
 * can express, with a machine-readable `code`.
 *
 * @module error
 */

/** The `LifeHashErrorCode` values, for enumeration. */
export const LifeHashErrorCode: {
  /** `version` is not one of the `LifeHashVersion` names. */
  readonly InvalidVersion: "InvalidVersion";
  /** `moduleSize` is not a positive integer, or the image it implies has more bytes than a `number` can count. */
  readonly InvalidModuleSize: "InvalidModuleSize";
  /** A digest that is not 32 bytes. */
  readonly InvalidDigestLength: "InvalidDigestLength";
  /** An argument of the wrong type: `text`, `data`, `digest`, `options` or `hasAlpha`. */
  readonly InvalidArgument: "InvalidArgument";
} = Object.freeze({
  InvalidVersion: "InvalidVersion",
  InvalidModuleSize: "InvalidModuleSize",
  InvalidDigestLength: "InvalidDigestLength",
  InvalidArgument: "InvalidArgument",
});

/** Machine-readable discriminant for a {@link LifeHashError}. */
export type LifeHashErrorCode = (typeof LifeHashErrorCode)[keyof typeof LifeHashErrorCode];

/** The argument an `InvalidArgument` error names. */
export type LifeHashParameter = "text" | "data" | "digest" | "options" | "hasAlpha";

/**
 * The structured payload of a {@link LifeHashError}, discriminated by `code`:
 * `e.details.code === "InvalidDigestLength"` narrows to `{ expected, actual }`.
 */
export type LifeHashErrorDetails =
  | {
      /** The discriminant. */
      readonly code: "InvalidVersion";
      /** The value received. */
      readonly value: unknown;
    }
  | {
      /** The discriminant. */
      readonly code: "InvalidModuleSize";
      /** The value received. */
      readonly value: unknown;
      /** The largest module size whose image holds at most `2 ** 53 - 1` bytes for the version and channel count, when that is what was exceeded. */
      readonly max?: number;
    }
  | {
      /** The discriminant. */
      readonly code: "InvalidDigestLength";
      /** The required length. */
      readonly expected: 32;
      /** The length received. */
      readonly actual: number;
    }
  | {
      /** The discriminant. */
      readonly code: "InvalidArgument";
      /** The argument. */
      readonly parameter: LifeHashParameter;
      /** The value received. */
      readonly value: unknown;
    };

/** A short description of a rejected value for `got …` clauses. */
export function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return `string ${JSON.stringify(value)}`;
  if (typeof value === "bigint") return `bigint ${value}n`;
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value !== "object") return typeof value === "number" ? String(value) : typeof value;
  const proto = Object.getPrototypeOf(value) as { constructor?: { name?: unknown } } | null;
  const name = proto?.constructor?.name;
  return typeof name === "string" && name !== "" ? name : "object";
}

/**
 * Thrown for an unknown version name (`InvalidVersion`), a module size that
 * is not a positive integer or whose image would hold more bytes than a
 * `number` can count (`InvalidModuleSize`), a digest that is not 32 bytes
 * (`InvalidDigestLength`), and an argument of the wrong type
 * (`InvalidArgument`). Every check runs before any rendering. Instances come
 * from the static factories only.
 *
 * @example
 * ```ts
 * try {
 *   makeFromUtf8(text, { version: name });
 * } catch (e) {
 *   if (LifeHashError.isLifeHashError(e) && e.is("InvalidVersion")) {
 *     // name is not a LifeHash version
 *   }
 * }
 * ```
 */
export class LifeHashError extends Error {
  /** Always `"LifeHashError"`; the cross-copy identity {@link LifeHashError.isLifeHashError} checks. */
  override readonly name = "LifeHashError";
  /** The discriminant; equals `details.code`. */
  readonly code: LifeHashErrorCode;
  /** The structured payload, discriminated by `code`. */
  readonly details: LifeHashErrorDetails;

  private constructor(message: string, details: LifeHashErrorDetails) {
    super(message);
    this.code = details.code;
    this.details = details;
  }

  /** Type guard for a `LifeHashError`, including one from another copy of this package. */
  static isLifeHashError(value: unknown): value is LifeHashError {
    return value instanceof Error && value.name === "LifeHashError" && "code" in value;
  }

  /** `true` when `code` is this error's code. */
  is(code: LifeHashErrorCode): boolean {
    return this.code === code;
  }

  /** `value` is not a `LifeHashVersion` name. */
  static invalidVersion(value: unknown): LifeHashError {
    return new LifeHashError(
      `version must be a LifeHash version name, got ${describeValue(value)}`,
      {
        code: "InvalidVersion",
        value,
      },
    );
  }

  /** `value` is not a positive integer. */
  static invalidModuleSize(value: unknown): LifeHashError {
    return new LifeHashError(`moduleSize must be a positive integer, got ${describeValue(value)}`, {
      code: "InvalidModuleSize",
      value,
    });
  }

  /** `value` would make the image larger than `2 ** 53 - 1` bytes; `max` is the largest allowed. */
  static moduleSizeTooLarge(value: number, max: number, what: string): LifeHashError {
    return new LifeHashError(`moduleSize must be at most ${max} for ${what}, got ${value}`, {
      code: "InvalidModuleSize",
      value,
      max,
    });
  }

  /** The digest had `actual` bytes; 32 were required. */
  static invalidDigestLength(actual: number): LifeHashError {
    return new LifeHashError(`digest must be 32 bytes, got ${actual}`, {
      code: "InvalidDigestLength",
      expected: 32,
      actual,
    });
  }

  /** `parameter` received `value`, which is not of the required type. */
  static invalidArgument(
    parameter: LifeHashParameter,
    value: unknown,
    requirement: string,
  ): LifeHashError {
    return new LifeHashError(`${parameter} must be ${requirement}, got ${describeValue(value)}`, {
      code: "InvalidArgument",
      parameter,
      value,
    });
  }
}
