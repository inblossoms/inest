import "reflect-metadata";

import type { Express } from "express";
import * as express from "express";
import { Logger } from "./logger-server";
import { ProviderCollector } from "./providers/provider-collector";
import { ModuleRegistry } from "./modules/module-registry";
import { ControllerRegistry } from "./controllers/controller-registry";
import { RouterExplorer } from "./router/router-explorer";
import { MODULE_METADATA } from "@/packages/common/constants";
import { MiddlewareManager } from "./middleware";

/**
 * NestApplication 类
 * Nest.js 应用程序的核心类，负责：
 * 1. 初始化应用程序
 * 2. 注册控制器和路由
 * 3. 处理依赖注入
 * 4. 管理中间件
 * 5. 启动 HTTP 服务器
 */
export class NestApplication {
   /** Express 应用实例 */
   private readonly app: Express = express();
   /** 模块注册器实例 */
   private readonly moduleRegistry: ModuleRegistry;
   /** 提供者收集器实例 */
   private readonly providerCollector: ProviderCollector;
   /** 控制器注册器实例 */
   private readonly controllerRegistry: ControllerRegistry;
   /** 路由探索器实例 */
   private readonly routerExplorer: RouterExplorer;
   /** 中间件管理器实例 */
   private middlewareManager: MiddlewareManager;

   /**
    * 创建新的 NestApplication 实例
    * @param module - 应用程序的根模块，包含所有控制器、提供者和导入的模块
    */
   constructor(private readonly module: any) {
      // 初始化模块注册器
      this.moduleRegistry = new ModuleRegistry();

      // 初始化提供者收集器
      this.providerCollector = new ProviderCollector(this.moduleRegistry);

      // 设置模块注册器的提供者收集器
      this.moduleRegistry.setProviderCollector(this.providerCollector);

      // 初始化控制器注册器
      this.controllerRegistry = new ControllerRegistry(this.providerCollector);

      // 初始化路由探索器
      this.routerExplorer = new RouterExplorer(
         this.app,
         this.providerCollector
      );

      // 配置请求体解析中间件
      this.bodyParser();

      // 添加用户信息中间件
      this.app.use(function (req, res, next) {
         (req as any).user = { name: "roy", ID: "0024" };
         next();
      });
   }

   /**
    * 初始化中间件
    */
   private async initMiddleware() {
      // 确保提供者已经被收集
      await this.moduleRegistry.registerModule(this.module);

      // 初始化中间件管理器
      this.middlewareManager = new MiddlewareManager(
         this.app,
         (provider: any) => {
            if (typeof provider !== "function") {
               return [];
            }

            // 收集提供者
            this.providerCollector.collectProviders(provider);

            // 获取提供者的依赖
            const dependencies = this.providerCollector.getProviderDependencies(
               provider,
               provider.name
            );

            // 确保所有依赖都被正确解析
            return dependencies.map((dep) => {
               if (dep === undefined || dep === null) {
                  Logger.warn(
                     `Dependency for ${provider.name} is ${
                        dep === undefined ? "undefined" : "null"
                     }`,
                     "NestApplication"
                  );
                  // 尝试从 providerCollector 中重新获取依赖
                  const resolvedDep =
                     this.providerCollector.resolveProvider(dep);
                  if (resolvedDep === undefined || resolvedDep === null) {
                     Logger.error(
                        `Failed to resolve dependency for ${provider.name}`,
                        "NestApplication"
                     );
                  }
                  return resolvedDep;
               }
               return dep;
            });
         }
      );

      // 配置中间件
      if (typeof this.module.prototype?.configure === "function") {
         this.module.prototype.configure(this);
      }
   }

   /**
    * 应用中间件
    * @param middleware - 要应用的中间件
    */
   apply(...middleware): this {
      Logger.log("Applying middleware...", "NestApplication");
      this.middlewareManager.apply(...middleware);
      return this;
   }

   /**
    * 排除特定路由的中间件
    * @param routes - 要排除的路由
    */
   exclude(...routes): this {
      Logger.log("Excluding middleware from routes...", "NestApplication");
      this.middlewareManager.exclude(...routes);
      return this;
   }

   /**
    * 为指定路由应用中间件
    * @param routes - 要应用中间件的路由
    */
   forRoutes(...routes): this {
      Logger.log("Applying middleware to routes...", "NestApplication");
      this.middlewareManager.forRoutes(...routes);
      return this;
   }

   /**
    * 初始化应用程序
    * 执行以下步骤：
    * 1. 注册所有模块并收集提供者
    * 2. 初始化控制器
    * 3. 探索并注册路由
    */
   async init() {
      Logger.log("Starting Nest application...", "NestApplication");

      // 初始化中间件（包括提供者收集）
      Logger.log("Initializing middleware...", "NestApplication");
      await this.initMiddleware();
      Logger.log("Middleware initialized", "NestApplication");

      // 初始化控制器
      Logger.log("Initializing controllers...", "NestApplication");
      const controllers =
         Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, this.module) || [];
      await this.controllerRegistry.initializeControllers(controllers);
      Logger.log("Controllers initialized", "NestApplication");

      // 探索并注册路由
      Logger.log("Exploring and registering routes...", "NestApplication");
      this.routerExplorer.explore(this.module);
      Logger.log("Routes registered", "NestApplication");

      Logger.log("Nest application successfully started", "NestApplication");
   }

   /**
    * 配置请求体解析中间件
    * 支持以下格式：
    * 1. JSON 格式
    * 2. URL 编码格式
    * 3. 纯文本格式
    */
   private bodyParser() {
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));
      this.app.use(express.text());
   }

   /**
    * 向 Express 应用程序添加中间件
    * @param args - 中间件参数
    * @returns NestApplication 实例，支持链式调用
    */
   public use(...args): this {
      this.app.use(...args);
      return this;
   }

   /**
    * 在指定端口启动 HTTP 服务器
    * @param port - 要监听的端口号
    * @throws 如果应用程序初始化失败，将抛出错误
    */
   async listen(port: number) {
      try {
         await this.init();
      } catch (error) {
         Logger.error(
            "Error during application initialization:",
            error,
            "NestApplication"
         );
         throw error;
      }
      this.app.listen(port, () => {
         Logger.log(
            `Application is running on: http://localhost:${port}`,
            "NestApplication"
         );
      });
   }
}
