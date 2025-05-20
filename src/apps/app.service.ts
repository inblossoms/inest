import { Inject, Injectable } from "@/packages/common/index";

@Injectable()
export class AppSerivce {
   constructor(
      @Inject("PEOPLE")
      private people: string
   ) {}

   getHello() {
      console.log("APPSERVICE: gethello.", this.people);

      return "APPSERVICE: gethello.";
   }
}
