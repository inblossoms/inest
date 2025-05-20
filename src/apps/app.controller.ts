import { HobbyService, UserSerivce } from "./user/user.service";
import { Controller, Get, Inject } from "../packages/common/index";
import { AppSerivce } from "./app.service";
import { NewsService } from "./news/news.service";
import { ProductsService } from "./products/products.service";
import { DynamicSerivce } from "./dynamic/dynamic.service";

@Controller("app") // 用于定义控制器 处理特定的请求路径和方法
export class AppController {
   constructor(
      private readonly appService: AppSerivce,
      private readonly dynamicService: DynamicSerivce,
      private readonly newsService: NewsService,
      private readonly productsService: ProductsService,
      @Inject("HOBBYSERVICE") private readonly hobbyService: HobbyService,
      @Inject("USERSERVICE") private readonly userService: UserSerivce,
      @Inject("META") private readonly meta: string
   ) {}

   @Get("hello")
   getHello() {
      return this.appService.getHello();
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
      return {
         message: "Testing META provider from AppController",
         meta: this.meta,
         timestamp: new Date().toLocaleString(),
      };
   }
}
