import { HobbyService, UserSerivce } from "./user/user.service";
import {
   BadGatewayException,
   Controller,
   Get,
   HttpException,
   HttpStatus,
   Inject,
   Post,
   UseFilters,
} from "../packages/common/index";
import { AppSerivce } from "./app.service";
import { NewsService } from "./news/news.service";
import { ProductsService } from "./products/products.service";
import { DynamicSerivce } from "./dynamic/dynamic.service";
import { CustomExceptionFilter } from "./others/custom-exception.filter";

@Controller("app") // 用于定义控制器 处理特定的请求路径和方法
@UseFilters(CustomExceptionFilter)
export class AppController {
   constructor(
      private readonly appService: AppSerivce,
      private readonly dynamicService: DynamicSerivce,
      private readonly newsService: NewsService,
      private readonly productsService: ProductsService,
      @Inject("HOBBYSERVICE") private readonly hobbyService: HobbyService,
      @Inject("USERSERVICE") private readonly userService: UserSerivce,
      @Inject("META") private readonly meta: string,
      @Inject("EXISTING_SERVICE") private readonly existingservice: AppSerivce
   ) {}

   @Get("hello")
   getHello() {
      return this.appService.getHello("Root");
   }

   @Get("existing")
   getExisting() {
      return this.existingservice.getHello("Existing");
   }

   @Get("news")
   getNews() {
      return this.newsService.publicNews("This's a big news!");
   }

   @Get("user")
   getUser() {
      return this.userService.getUser();
   }

   @Get("info")
   getInfo() {
      return this.userService.getInfo();
   }

   @Get("hobby")
   getHobbies() {
      return this.hobbyService.getHobbies();
   }

   @Get("products")
   getProducts() {
      return this.productsService.products("Laptop");
   }

   @Get("config")
   getConfig() {
      return this.dynamicService.getConfig();
   }

   @Get("meta")
   getMeta() {
      console.log(this);

      return {
         message: "Testing META provider from AppController",
         meta: this.meta,
         timestamp: new Date().toLocaleString(),
      };
   }

   @Get("middleware1")
   getMiddlewareForGet() {
      console.log("MIDDLEWARE FOR GET");

      return "MIDDLEWARE FOR GET.";
   }

   @Post("middleware")
   getMiddleware() {
      console.log("MIDDLEWARE Log for App.Controller.ts");

      return "MIDDLEWARE Log for App.Controller.ts";
   }

   @Get("error")
   getError() {
      //   throw new Error("Unrecognized error.");
      //   throw new HttpException("This is a test error", HttpStatus.BAD_REQUEST);
      throw new HttpException(
         {
            status: HttpStatus.FORBIDDEN,
            error: "This's a cumtom Error.",
         },
         HttpStatus.FORBIDDEN
      );
   }

   @Get("custom")
   getCustomException() {
      throw new BadGatewayException("This is a custom exception");
   }

   @Get("bad-gateway")
   getBadGatewayException() {
      throw new BadGatewayException();
   }
}
