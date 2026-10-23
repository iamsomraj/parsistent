/**
 * Converts between a stored string and a typed value.
 *
 * The built-in helpers ({@link string}, {@link number}…) return one, and any object
 * with the same shape works too, such as nuqs parsers.
 *
 * @template T The value type
 */
export type Value<T> = {
  /** Converts a stored string into a value, returning `null` (or throwing) when invalid */
  parse(raw: string): T | null;
  /** Converts a value into the string to store */
  serialize(value: T): string;
  /** Compares two values (default: `===`) */
  eq?(valueA: T, valueB: T): boolean;
  /** Returned when the key is missing or its stored value is invalid */
  readonly defaultValue?: T;
  /** Only single-value parsers are supported (nuqs multi parsers are rejected) */
  readonly type?: 'single';
};

/** A {@link Value} with a default value. */
export type ValueWithDefault<T> = Value<T> & { readonly defaultValue: T };

/** Describes the keys of a store: each key maps to a {@link Value}. */
export type Schema = Record<string, Value<any>>;

/**
 * The type read from a key: the value type, or `T | null` when the
 * {@link Value} has no default.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferValue<V> = V extends { readonly defaultValue: infer D }
  ? D
  : V extends Value<infer T>
    ? T | null
    : never;

/** The type accepted when writing a key. */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferInput<V> = V extends Value<infer T> ? T : never;

/**
 * The Standard Schema interface (https://standardschema.dev), implemented
 * by Zod, Valibot, ArkType and others.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown
    ) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output } | undefined;
  };
}

/** Result of a Standard Schema validation. */
export type StandardSchemaV1Result<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<{ readonly message: string }> };
