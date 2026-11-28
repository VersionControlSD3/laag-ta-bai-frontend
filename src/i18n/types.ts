/**
 * The English messages are the source of truth. `Translation<typeof en>` keeps the same keys and
 * function signatures but widens string literals, so every other language must translate every key
 * (a missing or extra key is a type error).
 */
export type Translation<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { [K in keyof T]: Translation<T[K]> }

export type Language = 'en' | 'ceb'

/** One namespace: English plus its Cebuano translation, kept side by side for review. */
export type Namespace<T> = { en: T; ceb: Translation<T> }

export function defineMessages<T>(en: T, ceb: Translation<T>): Namespace<T> {
  return { en, ceb }
}
