import "reflect-metadata";
import { NestFactory } from "../packages/core/index"; // nest inst
import { AppModule } from "./app.module"; // root
import * as session from "express-session";
import { Logger } from "../packages/core/logger-server";

async function bootstrap() {
   try {
      Logger.log("Starting application bootstrap...", "bootstrap");

      const app = await NestFactory.create(AppModule);
      Logger.log("Nest application created successfully", "bootstrap");

      app.use(
         session({
            secret: `NEST-SECRET`, // 加密会话密钥
            resave: false, // 请求结束后是否强制保存会话，即使数据并未发生变更
            saveUninitialized: false, // 是否保存未初始化会话
            cookie: { maxAge: 1000 * 3600 * 24 }, // 最大保存时间
         })
      );

      Logger.log("Session middleware applied successfully", "bootstrap");

      await app.listen(3000);
      Logger.log("Application is listening on port 3000", "bootstrap");
   } catch (error) {
      Logger.error(
         `Failed to start application: ${error.message}`,
         "bootstrap"
      );
      process.exit(1);
   }
}

bootstrap().catch((error) => {
   Logger.error(`Unhandled error: ${error.message}`, "bootstrap");
   process.exit(1);
});
