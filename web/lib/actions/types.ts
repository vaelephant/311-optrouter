/**
 * Server Actions 统一返回类型
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
