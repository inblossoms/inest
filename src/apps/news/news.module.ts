import { Module } from "@/packages/common/index";
import { NewsService } from "./news.service";

@Module({
   providers: [NewsService],
   exports: [NewsService],
})
export class NewsModule {}
