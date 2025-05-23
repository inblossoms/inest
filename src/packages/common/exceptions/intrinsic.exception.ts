/**
 * 表示应用程序内部错误的异常。
 * 当被抛出时，默认的异常过滤器将不记录错误消息。
 * @publicApi
 */
export class IntrinsicException extends Error {}
