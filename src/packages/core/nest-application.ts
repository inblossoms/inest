import "reflect-metadata";
import type { Express } from "express";
import * as express from "express";
import { RouterExplorer } from "./router/router-explorer";
import { ProviderCollector } from "./providers/provider-collector";
import { ModuleRegistry } from "./modules/module-registry";
import { MODULE_METADATA } from "@/packages/common/constants";
import { MiddlewareManager } from "./middleware";
import { Logger } from "./logger-server";
import { ControllerRegistry } from "./controllers/controller-registry";
import { ExceptionFilterManager } from "./exceptions/exception-filter-manager";
import { ExternalExceptionFilter } from "./exceptions/external-exception-filter";
import { FilterManager } from "./exceptions/filter-manager";
import { APP_FILTER } from "./constants";

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
   /** 异常过滤器管理器实例 */
   private readonly exceptionFilterManager: ExceptionFilterManager;
   /** 外部异常过滤器 */
   private readonly externalExceptionFilter = new ExternalExceptionFilter();
   /** 过滤器管理器实例 */
   private readonly filterManager: FilterManager;

   /**
    * 创建新的 NestApplication 实例
    * @param module - 应用程序的根模块，包含所有控制器、提供者和导入的模块
    */
   constructor(private readonly module: any) {
      // Initialize module registry
      this.moduleRegistry = new ModuleRegistry();

      // Initialize provider collector
      this.providerCollector = new ProviderCollector(this.moduleRegistry);

      // Set provider collector in module registry
      this.moduleRegistry.setProviderCollector(this.providerCollector);

      // Initialize exception filter manager first
      this.exceptionFilterManager = new ExceptionFilterManager(
         this.providerCollector.getProviderDependencies.bind(
            this.providerCollector
         )
      );

      // Initialize filter manager
      this.filterManager = new FilterManager(
         this.providerCollector,
         this.exceptionFilterManager
      );

      // Initialize controller registry with exception filter manager
      this.controllerRegistry = new ControllerRegistry(
         this.providerCollector,
         this.exceptionFilterManager
      );

      // Initialize router explorer with exception handler
      this.routerExplorer = new RouterExplorer(
         this.app,
         this.providerCollector,
         this.handleException.bind(this)
      );

      // Configure body parser
      this.bodyParser();

      // Add user info middleware
      this.app.use(function (req, res, next) {
         (req as any).user = { name: "roy", ID: "0024" };
         next();
      });
   }

   /**
    * 处理异常
    * @param err - 异常对象
    * @param context - 异常上下文
    */
   private async handleException(err: any, context: any) {
      await this.exceptionFilterManager.handleException(
         err,
         context,
         this.externalExceptionFilter
      );
   }

   /**
    * 初始化中间件
    */
   private async initMiddleware() {
      await this.moduleRegistry.registerModule(this.module);

      // Initialize filters
      this.filterManager.initializeFilters();

      this.middlewareManager = new MiddlewareManager(
         this.app,
         this.providerCollector.getProviderDependencies.bind(
            this.providerCollector
         )
      );

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

      Logger.log("Initializing middleware...", "NestApplication");
      await this.initMiddleware();
      Logger.log("Middleware initialized", "NestApplication");

      Logger.log("Initializing controllers...", "NestApplication");
      const controllers =
         Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, this.module) || [];
      await this.controllerRegistry.initializeControllers(controllers);
      Logger.log("Controllers initialized", "NestApplication");

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
