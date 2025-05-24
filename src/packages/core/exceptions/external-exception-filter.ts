import { ArgumentsHost } from "@/packages/common/interfaces/features/arguments-host.interface";
import { IntrinsicException } from "@/packages/common/exceptions/intrinsic.exception";
import { Logger } from "../logger-server";
import { HttpException } from "@/packages/common/exceptions/http.exception";
import { HttpStatus } from "@/packages/common/enums/http-status.enum";

/**
 * 外部异常过滤器
 * 用于处理应用程序中抛出的各种异常，并将其转换为适当的HTTP响应
 *
 * @template T 异常类型
 * @template R 返回值类型
 */
export class ExternalExceptionFilter<T = any, R = any> {
   private static readonly logger = Logger;

   /**
    * 处理异常并生成适当的HTTP响应
    *
    * @param exception 捕获到的异常
    * @param host 请求上下文对象，用于获取HTTP特定的信息
    * @returns 处理结果或Promise
    */
   catch(exception: T, host: ArgumentsHost): R | Promise<R> {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();

      // 处理HTTP异常
      if (exception instanceof HttpException) {
         return this.handleHttpException(exception, response, request);
      }

      // 处理其他类型的异常
      return this.handleUnknownException(exception, response, request);
   }

   /**
    * 处理HTTP异常
    * 将HttpException转换为标准化的HTTP响应
    *
    * @param exception HTTP异常实例
    * @param response Express响应对象
    * @param request Express请求对象
    * @returns 处理结果
    */
   private handleHttpException(
      exception: HttpException,
      response: any,
      request: any
   ): R {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();

      // 构建标准化的错误响应
      const responseBody = {
         statusCode: status,
         timestamp: new Date().toISOString(),
         path: request.url,
         ...(typeof errorResponse === "string"
            ? { message: errorResponse }
            : errorResponse),
      };

      // 记录错误信息
      this.logError(exception, status);

      // 发送响应
      response.status(status).json(responseBody);
      return;
   }

   /**
    * 处理未知类型的异常
    * 将非HTTP异常转换为500内部服务器错误响应
    *
    * @param exception 未知类型的异常
    * @param response Express响应对象
    * @param request Express请求对象
    * @returns 处理结果
    */
   private handleUnknownException(
      exception: any,
      response: any,
      request: any
   ): R {
      // 记录非IntrinsicException的错误
      if (
         exception instanceof Error &&
         !(exception instanceof IntrinsicException)
      ) {
         this.logError(exception, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // 构建默认错误响应
      const responseBody = {
         statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
         message: "Internal server error",
         timestamp: new Date().toISOString(),
         path: request.url,
         // 在开发环境下添加更多错误信息
         ...(process.env.NODE_ENV === "development" && {
            error:
               exception instanceof Error
                  ? exception.message
                  : String(exception),
            stack: exception instanceof Error ? exception.stack : undefined,
         }),
      };

      // 发送响应
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(responseBody);
      return;
   }

   /**
    * 记录错误信息
    *
    * @param exception 异常对象
    * @param status HTTP状态码
    */
   private logError(exception: any, status: number): void {
      const errorMessage =
         exception instanceof Error ? exception.message : String(exception);
      const errorStack =
         exception instanceof Error ? exception.stack : undefined;

      ExternalExceptionFilter.logger.error(
         `[${status}] ${errorMessage}${errorStack ? `\n${errorStack}` : ""}`
      );
   }
}
