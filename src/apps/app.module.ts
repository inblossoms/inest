import { UserModule } from "./user/user.module";
import { ProductsModule } from "./products/products.module";
import { NestModule } from "@/packages/common/interfaces/nest-module.interface";
import { Module } from "../packages/common/index";
import { MiddlewareConsumer } from "@/packages/common/interfaces/middleware";
import { LoggerMiddleware } from "./middleware/logger.middleware";
import { DynamicSerivce } from "./dynamic/dynamic.service";
import { DatabaseModule as DynamicModule } from "./dynamic/dynamic-config.module";
import { AppSerivce } from "./app.service";
import { AppController } from "./app.controller"; // router
import { RequestMethod } from "@/packages/common/enums";

@Module({
   imports: [
      UserModule,
      ProductsModule,
      DynamicModule.forRoot([
         {
            provide: "DYNAMIC-MODULE1",
            useValue: { APITOKEN: "DYNAMIC-MODULE1" },
         },
         {
            provide: "DYNAMIC-MODULE2",
            useValue: { APITOKEN: "DYNAMIC-MODULE2" },
         },
      ]),
   ],
   controllers: [AppController],
   providers: [
      AppSerivce,
      {
         provide: AppSerivce,
         useClass: AppSerivce,
      },
      DynamicSerivce,
   ],
})
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
      //   consumer.apply(LoggerMiddleware).forRoutes("App");
      consumer.apply(LoggerMiddleware).forRoutes({
         path: "middleware",
         method: RequestMethod.GET,
      });
   }
}
