import { Injectable } from "@/packages/common/index";
import { NestMiddleware } from "@/packages/common/interfaces/middleware";
import { NextFunction, Request, Response } from "express";
import { InjectableService } from "./injectable-service";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
   constructor(private injectableService: InjectableService) {}

   use(req: Request, res: Response, next: NextFunction) {
      console.log("MIDDLEWARE", req.originalUrl);
      console.log(this.injectableService.getInjectableService());

      next();
   }
}
