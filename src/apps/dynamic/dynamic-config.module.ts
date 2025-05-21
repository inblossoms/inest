import { Module } from "@/packages/common/index";
import { DynamicModule } from "@/packages/common/interfaces/modules";
import { createDatabaseProviders } from "./database.providers";

@Module({
   providers: [
      {
         provide: "META",
         useValue: "META",
      },
   ],
   exports: ["META"],
})
export class DatabaseModule {
   static forRoot(entities = [], options?): DynamicModule {
      const providers = createDatabaseProviders(entities, options);
      return {
         module: DatabaseModule,
         providers: providers,
         exports: providers.map((provider) =>
            provider instanceof Function ? provider : provider.provide
         ),
      };
   }
}
