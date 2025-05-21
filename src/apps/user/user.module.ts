import { Module } from "@/packages/common/index";
import { HobbyService, UserSerivce } from "./user.service";
import { NewsModule } from "../news/news.module";

@Module({
   imports: [NewsModule],
   providers: [
      {
         provide: "PEOPLE",
         useValue: "Roy !",
      },
      {
         provide: "USERSERVICE",
         useValue: new UserSerivce(),
      },
      {
         provide: "HOBBYSERVICE",
         useFactory: (x: string, y: string) => new HobbyService(x, y),
         inject: ["Dancer", "PEOPLE"],
      },
   ],
   exports: ["PEOPLE", "USERSERVICE", "HOBBYSERVICE", NewsModule],
})
export class UserModule {}
