import { HttpStatus } from "../enums/http-status.enum";
import { HttpException, HttpExceptionOptions } from "./http.exception";

/**
 * Defines an HTTP exception for *Internal Server Error* type errors.
 *
 * @see [Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)
 *
 * @publicApi
 */
export class InternalServerErrorException extends HttpException {
   /**
    * Instantiate an `InternalServerErrorException` Exception.
    *
    * @example
    * `throw new InternalServerErrorException()`
    *
    * @usageNotes
    * HTTP响应状态码将为500。
    * - 'objectOrError'参数定义JSON响应体或消息字符串。
    * - 'descriptionOrOptions'参数包含HTTP错误的简短描述或用于提供潜在错误原因的options对象。
    *
    * 默认情况下，JSON响应体包含两个属性：
    * - 'statusCode'：这将是值500。
    * - 'message'：默认为字符串“内部服务器错误”；通过提供
    * - 'objectOrError'参数中的字符串。
    *
    * 如果参数 'objectOrError' 是一个字符串，响应体将包含一个
    * 附加属性 'error' ，带有HTTP错误的简短描述。来重写
    * 整个JSON响应体，传递一个对象代替。Nest将序列化该对象
    *并将其作为JSON响应体返回。
    * @param objectOrError string or object describing the error condition.
    * @param descriptionOrOptions either a short description of the HTTP error or an options object used to provide an underlying error cause
    */
   constructor(
      objectOrError?: any,
      descriptionOrOptions:
         | string
         | HttpExceptionOptions = "Internal Server Error"
   ) {
      const { description, httpExceptionOptions } =
         HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

      super(
         HttpException.createBody(
            objectOrError,
            description!,
            HttpStatus.INTERNAL_SERVER_ERROR
         ),
         HttpStatus.INTERNAL_SERVER_ERROR,
         httpExceptionOptions
      );
   }
}
