import {
   Express,
   Request as ExpressRequest,
   Response as ExpressResponse,
   NextFunction,
} from "express";
import { RequestMethod } from "../../common/enums/request-method.enum";
import { Logger } from "../logger-server";
import { isFunction, isObject } from "@/packages/shared/shared.utils";

/**
 * 中间件管理器类
 * 负责管理应用程序的所有中间件，包括：
 * 1. 中间件的注册和存储
 * 2. 中间件的应用和排除
 * 3. 路由匹配和中间件执行
 */
export class MiddlewareManager {
   // 存储已注册的中间件实例，key 为中间件类，value 为中间件实例
   private readonly middlewares = new Map();
   // 存储被排除的路由信息，key 为 "method:path" 格式的字符串，value 为路由信息对象
   private readonly excludeMiddlewares = new Map<
      string,
      { routePath: string; routeMethod: RequestMethod }
   >();

   // HTTP 方法映射表，将 RequestMethod 枚举值映射到 Express 的 HTTP 方法名
   private readonly HTTP_METHOD_MAP = {
      GET: RequestMethod.GET,
      POST: RequestMethod.POST,
      PUT: RequestMethod.PUT,
      DELETE: RequestMethod.DELETE,
      PATCH: RequestMethod.PATCH,
      OPTIONS: RequestMethod.OPTIONS,
      HEAD: RequestMethod.HEAD,
   } as const;

   constructor(
      private readonly app: Express,
      private readonly getProviderDependencies: (provider: any) => any[]
   ) {}

   /**
    * 应用中间件
    * 支持多种类型的中间件：
    * 1. 函数中间件：标准的 Express 中间件函数
    * 2. 类中间件：包含 use 方法的类
    * 3. 中间件实例：已实例化的中间件对象
    * 4. Express 中间件：其他 Express 兼容的中间件
    */
   apply(...middleware): this {
      for (const m of middleware) {
         if (this.isFunctionMiddleware(m)) {
            // 直接使用函数中间件
            this.app.use(m);
         } else if (this.isClassMiddleware(m)) {
            // 实例化类中间件并注入依赖
            const dependencies = this.getProviderDependencies(m);
            const instance = new m(...dependencies);
            this.middlewares.set(m, instance);
         } else if (this.isMiddlewareInstance(m)) {
            // 直接使用中间件实例
            this.middlewares.set(m.constructor, m);
         } else if (this.isExpressMiddleware(m)) {
            // 使用 Express 中间件
            this.app.use(m);
         } else {
            Logger.warn(
               `Invalid middleware type: ${m?.constructor?.name || typeof m}`,
               "MiddlewareManager"
            );
         }
      }
      return this;
   }

   /**
    * 为指定路由应用中间件
    * 处理流程：
    * 1. 遍历所有路由
    * 2. 对每个路由应用所有已注册的中间件
    * 3. 根据路由类型（函数/对象）选择不同的处理方式
    * 4. 创建中间件处理器，处理路由匹配和中间件执行
    */
   forRoutes(...routes): this {
      for (const route of routes) {
         for (const [middlewareClass, middlewareInstance] of this.middlewares) {
            // 处理函数类型的路由
            if (typeof route === "function") {
               this.app.use((req, res, next) => {
                  if (this.isExclude(req)) {
                     return next();
                  }
                  middlewareInstance.use(req, res, next);
               });
               continue;
            }

            // 处理对象类型的路由
            const { routePath, routeMethod } = this.normalizeRouteInfo(route);
            const expressPath = this.normalizeExpressPath(routePath);

            // 创建中间件处理器
            const middlewareHandler = (
               req: ExpressRequest,
               res: ExpressResponse,
               next: NextFunction
            ) => {
               const requestPath = req.originalUrl || req.url;

               // 检查路径匹配
               if (!this.matchPath(requestPath, expressPath)) {
                  return next();
               }

               // 检查方法匹配
               if (routeMethod !== RequestMethod.ALL) {
                  const requestMethod =
                     this.HTTP_METHOD_MAP[req.method.toUpperCase()];
                  if (requestMethod !== routeMethod) {
                     return next();
                  }
               }

               // 检查是否被排除
               if (this.isExclude(req)) {
                  return next();
               }

               // 执行中间件
               try {
                  middlewareInstance.use(req, res, next);
               } catch (error) {
                  Logger.error(
                     `Middleware ${middlewareClass.name} execution error:`,
                     error,
                     "MiddlewareManager"
                  );
                  next(error);
               }
            };

            // 根据路由方法注册中间件
            if (routeMethod === RequestMethod.ALL) {
               this.app.use(expressPath, middlewareHandler);
            } else {
               const method = this.getHttpMethod(routeMethod);
               this.app[method](expressPath, middlewareHandler);
            }
         }
      }
      this.middlewares.clear();
      return this;
   }

   /**
    * 排除特定路由的中间件
    * 将路由信息转换为标准格式并存储到 excludeMiddlewares 中
    */
   exclude(...routes): this {
      for (const route of routes) {
         const { routePath, routeMethod } = this.normalizeRouteInfo(route);
         const key = this.getRouteKey(routePath, routeMethod);
         this.excludeMiddlewares.set(key, { routePath, routeMethod });
      }
      return this;
   }

   /**
    * 检查请求是否应该被排除
    * 检查流程：
    * 1. 检查完整路径匹配
    * 2. 检查通配符路径匹配
    * 3. 检查方法匹配
    */
   private isExclude(req: ExpressRequest): boolean {
      const originalUrl = req.originalUrl || req.url;
      const method = req.method.toUpperCase();
      const requestMethod = this.HTTP_METHOD_MAP[method] ?? RequestMethod.ALL;

      // 检查完整路径匹配
      const fullPathKey = this.getRouteKey(originalUrl, requestMethod);
      if (this.excludeMiddlewares.has(fullPathKey)) {
         return true;
      }

      // 检查通配符路径匹配
      for (const [key] of this.excludeMiddlewares) {
         const [excludedMethod, excludedPath] = key.split(":");
         const normalizedExcludedPath = this.normalizeExpressPath(excludedPath);
         const normalizedRequestPath = this.normalizeExpressPath(originalUrl);

         // 检查方法匹配
         const methodMatches =
            excludedMethod === RequestMethod.ALL.toString() ||
            excludedMethod === requestMethod.toString();

         // 检查路径匹配
         const pathMatches = this.matchPath(
            normalizedRequestPath,
            normalizedExcludedPath
         );

         if (methodMatches && pathMatches) {
            return true;
         }
      }

      return false;
   }

   /**
    * 检查是否为函数中间件
    * 标准 Express 中间件函数应该有三个参数：req, res, next
    */
   private isFunctionMiddleware(middleware: any): boolean {
      return typeof middleware === "function" && middleware.length === 3;
   }

   /**
    * 检查是否为类中间件
    * 类中间件应该：
    * 1. 是一个类
    * 2. 有 prototype
    * 3. prototype 上有 use 方法
    * 4. use 方法有三个参数
    */
   private isClassMiddleware(middleware: any): boolean {
      return (
         middleware &&
         isFunction(middleware) &&
         isObject(middleware.prototype) &&
         isFunction(middleware.prototype.use) &&
         middleware.prototype.use.length === 3
      );
   }

   /**
    * 检查是否为中间件实例
    * 中间件实例应该：
    * 1. 是一个对象
    * 2. 有 use 方法
    * 3. use 方法有三个参数
    */
   private isMiddlewareInstance(middleware: any): boolean {
      return (
         middleware &&
         isObject(middleware) &&
         isFunction((middleware as any).use) &&
         (middleware as any).use.length === 3
      );
   }

   /**
    * 检查是否为 Express 中间件
    * Express 中间件应该：
    * 1. 是一个对象
    * 2. 没有 use 方法（避免与中间件实例混淆）
    */
   private isExpressMiddleware(middleware: any): boolean {
      return (
         middleware &&
         isObject(middleware) &&
         !isFunction((middleware as any).use)
      );
   }

   /**
    * 检查请求路径是否匹配路由模式
    * 将路由模式转换为正则表达式进行匹配
    */
   private matchPath(requestPath: string, pattern: string): boolean {
      const regexPattern = this.getRegexPattern(pattern);
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(requestPath);
   }

   /**
    * 将路由模式转换为正则表达式模式
    * 转换规则：
    * 1. * 转换为 .*（匹配任意字符）
    * 2. : 转换为 [^/]+（匹配除 / 外的任意字符）
    */
   private getRegexPattern(pattern: string): string {
      return pattern.replace(/\*/g, ".*").replace(/:/g, "[^/]+");
   }

   /**
    * 生成路由键
    * 格式：method:path
    * 用于在 Map 中唯一标识一个路由
    */
   private getRouteKey(path: string, method: RequestMethod): string {
      const methodStr = typeof method === "number" ? method.toString() : method;
      return `${methodStr}:${path}`;
   }

   /**
    * 规范化路由信息
    * 处理不同类型的路由定义：
    * 1. 字符串：直接作为路径
    * 2. 对象：包含 path 和 method
    * 3. 函数：从元数据中获取路径
    */
   private normalizeRouteInfo(route: any): {
      routePath: string;
      routeMethod: RequestMethod;
   } {
      let routePath = "";
      let routeMethod = RequestMethod.ALL;

      if (typeof route === "string") {
         routePath = route;
      } else if ("path" in route) {
         routePath = route.path;
         routeMethod = route.method ?? RequestMethod.ALL;
      } else if (route instanceof Function) {
         routePath = Reflect.getMetadata("prefix", route) || "";
         routeMethod = RequestMethod.ALL;
      }

      routePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
      return { routePath, routeMethod };
   }

   /**
    * 规范化 Express 路径
    * 将 * 转换为 :param，使其符合 Express 的路由参数格式
    */
   private normalizeExpressPath(routePath: string): string {
      return routePath.replace(/\*/g, ":param");
   }

   /**
    * 获取 HTTP 方法名
    * 将 RequestMethod 枚举值转换为 Express 的 HTTP 方法名
    */
   private getHttpMethod(method: RequestMethod): string {
      const methodMap = {
         [RequestMethod.GET]: "get",
         [RequestMethod.POST]: "post",
         [RequestMethod.PUT]: "put",
         [RequestMethod.DELETE]: "delete",
         [RequestMethod.PATCH]: "patch",
         [RequestMethod.ALL]: "all",
         [RequestMethod.OPTIONS]: "options",
         [RequestMethod.HEAD]: "head",
      };
      return methodMap[method] || "all";
   }
}
