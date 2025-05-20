import { createParamDecorator } from "@/packages/common/decorators/http/create-route-param-metadata.decorator";

export const User = createParamDecorator(function (data, ctx) {
   const req = ctx.switchToHttp().getRequest();

   if (data) {
      return req.user[data];
   }

   return req.user;
});
