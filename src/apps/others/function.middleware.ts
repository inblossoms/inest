import { NextFunction, Request, Response } from "express";

export function functionMiddleware(
   req: Request,
   res: Response,
   next: NextFunction
) {
   console.log("FUNCTIONMIDDLEWARE");
   next();
}
