import { Injectable } from "@/packages/common/index";

@Injectable()
export class InjectableService {
   constructor() {}

   getInjectableService() {
      console.log("InjectableService");

      return "InjectableService";
   }
}
