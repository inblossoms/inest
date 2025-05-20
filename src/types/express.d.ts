import "express-session";

declare global {
   namespace Express {
      interface Request {
         session: any;
      }
   }
}
