/**
 * parsistent - Typed localStorage, sessionStorage and cookies, shaped like the browser APIs.
 *
 * @example
 * ```ts
 * import { createStorage, number, oneOf } from 'parsistent'
 *
 * const local = createStorage('local', {
 *   theme: oneOf(['light', 'dark'], 'light'),
 *   count: number(0),
 * })
 *
 * local.setItem('count', 3)
 * local.getItem('count') // 3
 * ```
 *
 * @packageDocumentation
 */

export { createStorage } from '@/storage';
export type {
  CreateStorageOptions,
  StorageChangeEvent,
  StorageChangeListener,
  StorageSource,
  TypedStorage,
} from '@/storage';
export { createCookieStore } from '@/cookies';
export type {
  CookieChangeEvent,
  CookieChangeListener,
  CookieInput,
  CookieOptions,
  CookieSnapshot,
  CreateCookieStoreOptions,
  TypedCookieStore,
} from '@/cookies';
export { boolean, date, json, number, oneOf, string } from '@/values';
export type { JsonValidator } from '@/values';
export type {
  inferInput,
  inferValue,
  Schema,
  StandardSchemaV1,
  StandardSchemaV1Result,
  Value,
  ValueWithDefault,
} from '@/types';
