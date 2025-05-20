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
         provide: "USERSERVICE", // token: 可以理解为 provider name
         useValue: new UserSerivce(), // 如果提供的是值会直接使用该值，如果是一个类 将会对该类进行实例化
      },
      {
         provide: "HOBBYSERVICE",
         inject: ["Dancer", "PEOPLE"],
         useFactory: (x, y) => new HobbyService(x, y),
      },
   ],
   exports: ["PEOPLE", "USERSERVICE", "HOBBYSERVICE", NewsModule],
})
export class UserModule {}
