import { Inject } from "@/packages/common/index";
import { Config } from "./database.providers";

export class DynamicSerivce {
   constructor(@Inject("DYNAMIC-MODULE1") private config: Config) {}

   getConfig() {
      console.log(this.config);

      return this.config;
   }
}
