import {
   ArgumentsHost,
   ExceptionFilter,
   Catch,
   BadGatewayException,
} from "@/packages/common/index";
import { InjectableService } from "./injectable-service";

@Catch(BadGatewayException)
export class CustomExceptionFilter implements ExceptionFilter {
   constructor(private readonly injectableService: InjectableService) {}

   catch(exception: BadGatewayException, host: ArgumentsHost): any {
      console.log("CustomException has been called.");
      console.log(this.injectableService.getInjectableService());
      const httpContext = host.switchToHttp();
      const response = httpContext.getResponse();
      response.status(exception.getStatus()).json({
         statusCode: exception.getStatus(),
         message: "👻 Write for fun.",
         error: exception.message,
         "👻": "👻",
      });
   }
}
