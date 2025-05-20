import { Injectable } from "@/packages/common/index";
import { ProductsService } from "../products/products.service";

@Injectable()
export class UserSerivce {
   private name: string;
   private id: string;

   constructor() {
      this.name = "Roy";
      this.id = "0024";
   }

   getUser() {
      console.log("USERSERVICE: getUser.");

      return "USERSERVICE: getUser.";
   }

   getInfo() {
      return {
         name: this.name,
         id: this.id,
      };
   }
}

@Injectable()
export class HobbyService {
   constructor(private x: string, private y: string) {
      (this.x = x), (this.y = y);
      console.log(x, y);
   }

   getHobbies() {
      console.log("HOBBYSERVICE: getHobbies.", this.x + this.y);

      return "HOBBYSERVICE: getHobbies.";
   }
}
