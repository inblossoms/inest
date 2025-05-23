import { isNumber, isObject, isString } from "@/packages/shared/shared.utils";
import {
   HttpExceptionBody,
   HttpExceptionBodyMessage,
} from "../interfaces/http/http-exception-body.interface";
import { IntrinsicException } from "./intrinsic.exception";

/**
 * HTTP异常选项接口
 * @interface HttpExceptionOptions
 * @property {unknown} [cause] - 错误的原始原因
 * @property {string} [description] - 错误描述
 */
export interface HttpExceptionOptions {
   /** 错误的原始原因 */
   cause?: unknown;
   /** 错误描述 */
   description?: string;
}

/**
 * 描述和选项接口
 * @interface DescriptionAndOptions
 * @property {string} [description] - 错误描述
 * @property {HttpExceptionOptions} [httpExceptionOptions] - HTTP异常选项
 */
export interface DescriptionAndOptions {
   description?: string;
   httpExceptionOptions?: HttpExceptionOptions;
}

/**
 * 定义基础的Nest HTTP异常类，由默认的异常处理器处理。
 *
 * @see [内置HTTP异常](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)
 *
 * @publicApi
 */
export class HttpException extends IntrinsicException {
   /**
    * 异常原因。指示错误的具体原始原因。
    * 当捕获并重新抛出具有更具体或更有用的错误消息的错误时使用，
    * 以便仍然可以访问原始错误。
    */
   public cause: unknown;

   /**
    * 实例化一个普通的HTTP异常。
    *
    * @example
    * throw new HttpException('消息', HttpStatus.BAD_REQUEST)
    * throw new HttpException('自定义消息', HttpStatus.BAD_REQUEST, {
    *  cause: new Error('原因错误'),
    * })
    *
    * @usageNotes
    * 构造函数参数定义了响应和HTTP响应状态码。
    * - `response` 参数（必需）定义JSON响应体。或者，它也可以是一个错误对象，
    *   用于定义错误[原因](https://nodejs.org/en/blog/release/v16.9.0/#error-cause)。
    * - `status` 参数（必需）定义HTTP状态码。
    * - `options` 参数（可选）定义额外的错误选项。目前支持`cause`属性，
    *   可以用作指定错误原因的替代方式：`const error = new HttpException('描述', 400, { cause: new Error() });`
    *
    * 默认情况下，JSON响应体包含两个属性：
    * - `statusCode`：HTTP状态码
    * - `message`：默认的HTTP错误简短描述；通过在`response`参数中提供字符串来覆盖此描述
    *
    * 要覆盖整个JSON响应体，请将对象传递给`createBody`方法。
    * Nest将序列化该对象并将其作为JSON响应体返回。
    *
    * `status`参数是必需的，应该是有效的HTTP状态码。
    * 最佳实践是使用从`nestjs/common`导入的`HttpStatus`枚举。
    *
    * @param response 描述错误条件或错误原因的字符串或对象
    * @param status HTTP响应状态码
    * @param options 用于添加错误原因的对象
    */
   constructor(
      private readonly response: string | Record<string, any>,
      private readonly status: number,
      private readonly options?: HttpExceptionOptions
   ) {
      super();
      this.initMessage();
      this.initName();
      this.initCause();
   }

   /**
    * 配置错误链支持
    *
    * @see https://nodejs.org/en/blog/release/v16.9.0/#error-cause
    * @see https://github.com/microsoft/TypeScript/issues/45167
    */
   public initCause(): void {
      if (this.options?.cause) {
         this.cause = this.options.cause;
         return;
      }
   }

   /**
    * 初始化错误消息
    * 根据响应类型设置适当的错误消息
    */
   public initMessage() {
      if (isString(this.response)) {
         this.message = this.response;
      } else if (isObject(this.response) && isString(this.response.message)) {
         this.message = this.response.message;
      } else if (this.constructor) {
         this.message =
            this.constructor.name.match(/[A-Z][a-z]+|[0-9]+/g)?.join(" ") ??
            "Error";
      }
   }

   /**
    * 初始化错误名称
    * 将错误名称设置为构造函数名称
    */
   public initName(): void {
      this.name = this.constructor.name;
   }

   /**
    * 获取响应内容
    * @returns 响应字符串或对象
    */
   public getResponse(): string | object {
      return this.response;
   }

   /**
    * 获取HTTP状态码
    * @returns HTTP状态码
    */
   public getStatus(): number {
      return this.status;
   }

   /**
    * 创建响应体
    * @param nil 空值
    * @param message 异常消息
    * @param statusCode 状态码
    * @returns HTTP异常响应体
    */
   public static createBody(
      nil: null | "",
      message: HttpExceptionBodyMessage,
      statusCode: number
   ): HttpExceptionBody;
   /**
    * 创建响应体
    * @param message 异常消息
    * @param error 错误信息
    * @param statusCode 状态码
    * @returns HTTP异常响应体
    */
   public static createBody(
      message: HttpExceptionBodyMessage,
      error: string,
      statusCode: number
   ): HttpExceptionBody;
   /**
    * 创建自定义响应体
    * @param custom 自定义响应体
    * @returns 自定义响应体
    */
   public static createBody<Body extends Record<string, unknown>>(
      custom: Body
   ): Body;
   public static createBody<Body extends Record<string, unknown>>(
      arg0: null | HttpExceptionBodyMessage | Body,
      arg1?: HttpExceptionBodyMessage | string,
      statusCode?: number
   ): HttpExceptionBody | Body {
      if (!arg0) {
         return {
            message: arg1!,
            statusCode: statusCode!,
         };
      }

      if (isString(arg0) || Array.isArray(arg0) || isNumber(arg0)) {
         return {
            message: arg0,
            error: arg1 as string,
            statusCode: statusCode!,
         };
      }

      return arg0;
   }

   /**
    * 从描述或选项中获取描述
    * @param descriptionOrOptions 描述字符串或选项对象
    * @returns 错误描述字符串
    */
   public static getDescriptionFrom(
      descriptionOrOptions: string | HttpExceptionOptions
   ): string {
      return isString(descriptionOrOptions)
         ? descriptionOrOptions
         : (descriptionOrOptions?.description as string);
   }

   /**
    * 从描述或选项中获取HTTP异常选项
    * @param descriptionOrOptions 描述字符串或选项对象
    * @returns HTTP异常选项对象
    */
   public static getHttpExceptionOptionsFrom(
      descriptionOrOptions: string | HttpExceptionOptions
   ): HttpExceptionOptions {
      return isString(descriptionOrOptions) ? {} : descriptionOrOptions;
   }

   /**
    * 实用程序方法，用于从给定的参数中提取错误描述和httpExceptionOptions。
    * 通过继承类来正确解析这两个选项。
    * @param descriptionOrOptions 描述字符串或选项对象
    * @returns 包含错误描述和httpExceptionOptions的对象
    */
   public static extractDescriptionAndOptionsFrom(
      descriptionOrOptions: string | HttpExceptionOptions
   ): DescriptionAndOptions {
      const description = isString(descriptionOrOptions)
         ? descriptionOrOptions
         : descriptionOrOptions?.description;

      const httpExceptionOptions = isString(descriptionOrOptions)
         ? {}
         : descriptionOrOptions;

      return {
         description,
         httpExceptionOptions,
      };
   }
}
