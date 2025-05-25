import { UserModule } from "./user/user.module";
import { NestModule } from "@/packages/common/interfaces/nest-module.interface";
import { Module } from "../packages/common/index";
import { MiddlewareConsumer } from "@/packages/common/interfaces/middleware";
import { LoggerMiddleware } from "./others/logger.middleware";
import { DynamicSerivce } from "./dynamic/dynamic.service";
import { DatabaseModule as DynamicModule } from "./dynamic/dynamic-config.module";
import { AppSerivce } from "./app.service";
import { AppController } from "./app.controller"; // router
import { RequestMethod } from "@/packages/common/enums";
import { InjectableService } from "./others/injectable-service";
import { functionMiddleware } from "./others/function.middleware";
import { FilterModule } from "./filter/filter.module";
import { OptionalModule } from "./others/optional/optional.module";
import { ProductsModule } from "./products/products.module";

@Module({
   imports: [
      UserModule,
      FilterModule,
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
      OptionalModule,
      ProductsModule,
   ],
   controllers: [AppController],
   providers: [
      AppSerivce,
      {
         provide: AppSerivce,
         useClass: AppSerivce,
      },
      DynamicSerivce,
      InjectableService,
      {
         provide: "EXISTING_SERVICE",
         useExisting: AppSerivce,
      },
   ],
})
// export class AppModule {}
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
      consumer
         .apply(LoggerMiddleware)
         .exclude({
            path: "app/middleware1",
            method: RequestMethod.GET,
         })
         //  .forRoutes(functionMiddleware);
         //  .forRoutes(AppController);
         //  .forRoutes("app/mi*r");
         //   .forRoutes("ap*/*");
         .forRoutes(
            { path: "app/middleware", method: RequestMethod.POST },
            { path: "app/middleware1", method: RequestMethod.GET }
         );
   }
}
