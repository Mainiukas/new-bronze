import type en from './en'

/**
 * Every word on screen, by place. English (en.ts) defines the shape; each
 * other language must supply every entry with the same arguments, so a
 * missing or mistyped translation fails the type check.
 */
export type Messages = typeof en
