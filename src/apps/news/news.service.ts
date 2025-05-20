import { Injectable } from "@/packages/common/index";

@Injectable()
export class NewsService {
   constructor() {}

   publicNews(news) {
      console.log("PUBLICNEWS: ", news);
      return "PUBLICNEWS: " + news;
   }
}
