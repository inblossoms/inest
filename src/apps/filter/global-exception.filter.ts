import {
   ArgumentsHost,
   Catch,
   ExceptionFilter,
   HttpException,
   HttpStatus,
} from "@/packages/common/index";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
   catch(exception: unknown, host: ArgumentsHost) {
      console.log("GlobalExceptionFilter has been called");

      const ctx = host.switchToHttp();
      const response = ctx.getResponse();

      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let errorResponse: any = {
         statusCode: status,
         message: "Internal server error",
         error: "Unknown error occurred",
         timestamp: new Date().toISOString(),
      };

      if (exception instanceof HttpException) {
         status = exception.getStatus();
         const exceptionResponse = exception.getResponse();

         console.log("A");

         errorResponse = {
            statusCode: status,
            message:
               typeof exceptionResponse === "string"
                  ? exceptionResponse
                  : (exceptionResponse as any).message || "Http Exception",
            error:
               typeof exceptionResponse === "string"
                  ? exceptionResponse
                  : (exceptionResponse as any).error || "Http Exception",
            timestamp: new Date().toISOString(),
         };
      } else if (exception instanceof Error) {
         console.log("B");
         errorResponse = {
            statusCode: status,
            message: "Internal server error",
            error: exception.message,
            timestamp: new Date().toISOString(),
         };
      }

      response.status(status).json(errorResponse);
   }
}
