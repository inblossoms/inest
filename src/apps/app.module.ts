import { Module } from "../packages/common/index";
import { AppController } from "./app.controller"; // router
import { AppSerivce } from "./app.service";
import { UserModule } from "./user/user.module";
import { ProductsModule } from "./products/pruducts.module";
import { DatabaseModule as DynamicModule } from "./dynamic/dynamic-config.module";
import { DynamicSerivce } from "./dynamic/dynamic.service";

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
export class AppModule {}
