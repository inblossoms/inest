import { Injectable } from "@/packages/common/index";

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
   private x: string;
   private y: string;

   constructor(x: string, y: string) {
      this.x = x;
      this.y = y;
   }

   getHobbies() {
      console.log("HOBBYSERVICE: getHobbies.", this.x, this.y);

      return {
         message: "HOBBYSERVICE: getHobbies.",
         x: this.x,
         y: this.y,
      };
   }
}
