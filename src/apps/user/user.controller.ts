import {
   Controller,
   Get,
   Post,
   Redirect,
   Req,
   Res,
   Request,
   Response,
   Body,
   Query,
   Headers,
   Session,
   IP,
   Param,
   Next,
   HttpCode,
   Header,
} from "@/packages/common/index";
import type {
   Request as ExpressRequest,
   Response as ExpressResponse,
   NextFunction,
} from "express";
import { User } from "./user.decorator";

@Controller("users")
export class UserController {
   @Get("")
   homePage() {
      return "Welcome to User API";
   }

   @Get("redirect")
   @Redirect("/users", 301)
   handleRedirect() {
      console.log("REDIRECT TO HOME");
   }

   @Get("req")
   handleRequest(
      @Req() req: ExpressRequest,
      @Request() request: ExpressRequest
   ) {
      console.log(req.url);
      console.log(req.method);

      return "handleRequest";
   }

   @Get(":user/u/:id")
   getUserInfo(
      @Param() params,
      @Param("user") user: string,
      @Param("id") id: number
   ) {
      console.log(params);
      console.log(user);
      console.log(id);

      return `Hello! ${user}, ID: ${id}`;
   }

   @Get("query")
   handleRequestWithParams(@Query() query: any, @Query("id") id: string) {
      console.log(query);
      console.log(id);

      return "handleRequestWithParams";
   }

   @Get("headers")
   handleHeaders(@Headers() headers: any, @Headers("accept") accept: string) {
      console.log(headers);
      console.log(accept);

      return "handleHeaders";
   }

   @Get("session")
   handleSession(
      @Session() session: any,
      @Session("pageView") pageView: string
   ) {
      console.log(session);
      console.log(pageView);

      session.pageView ? session.pageView++ : (session.pageView = 1);

      return "handleSession:" + session.pageView;
   }

   @Get("ip")
   getCurrentUserIP(@IP() ip: string) {
      console.log(ip);

      return "getCurrentUserIP:" + ip;
   }

   @Get("car/product*")
   handleWildcard() {
      return "handleWildcard";
   }

   @Post("create")
   @HttpCode(200)
   @Header("ID", "0024")
   @Header("Author", "ROY")
   // DTO <Data Transfer Object> 定义了数据如何通过网络传输
   createUser(@Body() userInfoDto, @Body("userName") name: string) {
      console.log(userInfoDto);
      console.log(name);

      return "user is created.";
   }

   @Post("diy")
   diyResultOfCreateUser(@Res({ passthrough: true }) res: ExpressResponse) {
      res.setHeader("key", "value");
      res.send("DIYRESULTOFCREATEUSER");
   }

   @Post("next")
   handleNext(@Next() next: NextFunction) {
      console.log("HANDLENEXT");
      next();
   }

   @Get("")
   HomePage() {
      console.log("HOMEPAGE");
      return "HOMEPAGE";
   }

   @Get("version")
   version() {
      console.log("VERSION");
      return "VERSION";
   }

   @Get("dynamic")
   dynamicRedirect(@Query("version") version: string) {
      return { url: `https://docs.nestjs.com/${version}` };
   }

   @Get("customParamDecorator")
   customParamDecorator(@User("ID") ID, @User() user) {
      console.log("USER:", user);
      console.log("ID:", ID);

      return user;
   }
}
