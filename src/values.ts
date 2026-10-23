import type { StandardSchemaV1, Value, ValueWithDefault } from '@/types';

function create<T>(definition: Value<T>, defaultValue: T | undefined): Value<T> {
  return defaultValue === undefined ? definition : { ...definition, defaultValue };
}

/**
 * Plain string.
 *
 * @example
 * ```ts
 * createStorage('local', { name: string('') })
 * ```
 */
export function string(defaultValue: string): ValueWithDefault<string>;
export function string(): Value<string>;
export function string(defaultValue?: string): Value<string> {
  return create({ parse: (raw) => raw, serialize: (value) => value }, defaultValue);
}

/**
 * One of a list of strings. Stored values outside the list are invalid.
 *
 * @example
 * ```ts
 * createStorage('local', { theme: oneOf(['light', 'dark'], 'light') })
 * ```
 */
export function oneOf<const Option extends string>(
  options: readonly Option[],
  defaultValue: NoInfer<Option>
): ValueWithDefault<Option>;
export function oneOf<const Option extends string>(options: readonly Option[]): Value<Option>;
export function oneOf<const Option extends string>(
  options: readonly Option[],
  defaultValue?: Option
): Value<Option> {
  return create(
    {
      parse: (raw) => (options.includes(raw as Option) ? (raw as Option) : null),
      serialize: (value) => value,
    },
    defaultValue
  );
}

/** Finite number. `NaN`, `Infinity` and non-numeric strings are invalid. */
export function number(defaultValue: number): ValueWithDefault<number>;
export function number(): Value<number>;
export function number(defaultValue?: number): Value<number> {
  return create(
    {
      parse: (raw) => {
        const value = raw.trim() === '' ? Number.NaN : Number(raw);
        return Number.isFinite(value) ? value : null;
      },
      serialize: (value) => String(value),
    },
    defaultValue
  );
}

/** Boolean, stored as `true` / `false`. Other strings are invalid. */
export function boolean(defaultValue: boolean): ValueWithDefault<boolean>;
export function boolean(): Value<boolean>;
export function boolean(defaultValue?: boolean): Value<boolean> {
  return create(
    {
      parse: (raw) => {
        if (raw === 'true' || raw === 'false') {
          return raw === 'true';
        }
        return null;
      },
      serialize: (value) => String(value),
    },
    defaultValue
  );
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.valueOf());
}

/** Date, stored as an ISO-8601 string. */
export function date(defaultValue: Date): ValueWithDefault<Date>;
export function date(): Value<Date>;
export function date(defaultValue?: Date): Value<Date> {
  return create(
    {
      parse: (raw) => {
        const value = new Date(raw);
        return isValidDate(value) ? value : null;
      },
      serialize: (value) => value.toISOString(),
      eq: (valueA, valueB) => valueA.valueOf() === valueB.valueOf(),
    },
    defaultValue
  );
}

/**
 * Validates a parsed JSON value: a function returning the value (or `null` / throwing
 * when invalid), or a Standard Schema such as Zod, Valibot or ArkType.
 */
export type JsonValidator<T> = ((value: unknown) => T | null) | StandardSchemaV1<unknown, T>;

function validate<T>(validator: JsonValidator<T>, value: unknown): T | null {
  // Checked first: some schemas are also callable (ArkType types are functions)
  if ('~standard' in validator) {
    const result = validator['~standard'].validate(value);
    if (result instanceof Promise) {
      throw new TypeError('[parsistent] json() only supports synchronous schemas');
    }
    return result.issues ? null : result.value;
  }
  return validator(value);
}

/**
 * JSON value, validated when read. Storage is user-controlled, so a validator is required.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * createStorage('local', {
 *   filters: json(z.object({ q: z.string() }), { q: '' }),
 * })
 * ```
 */
export function json<T>(validator: JsonValidator<T>, defaultValue: T): ValueWithDefault<T>;
export function json<T>(validator: JsonValidator<T>): Value<T>;
export function json<T>(validator: JsonValidator<T>, defaultValue?: T): Value<T> {
  return create(
    {
      parse: (raw) => validate(validator, JSON.parse(raw)),
      serialize: (value) => JSON.stringify(value),
      eq: (valueA, valueB) =>
        valueA === valueB || JSON.stringify(valueA) === JSON.stringify(valueB),
    },
    defaultValue
  );
}
