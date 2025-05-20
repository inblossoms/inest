import "express-session";

declare module "express" {
   interface Request {
      session: any;
      user?: {
         name: string;
         ID: string;
      };
   }
}
