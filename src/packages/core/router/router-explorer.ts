import {
   Express,
   Request as ExpressRequest,
   Response as ExpressResponse,
   NextFunction,
} from "express";
import * as path from "node:path";
import { Logger } from "../logger-server";
import {
   CUSTOM_ROUTE_ARGS_METADATA,
   HEADERS_METADATA,
   HTTP_CODE_METADATA,
   METHOD_METADATA,
   PARAMTYPES_METADATA,
   PATH_METADATA,
   REDIRECT_METADATA,
   ROUTE_ARGS_METADATA,
   MODULE_METADATA,
} from "@/packages/common/constants";
import { HttpArgumentsHost } from "@/packages/common/interfaces/features/arguments-host.interface";
import { ProviderCollector } from "../providers/provider-collector";
import { HttpStatus } from "@/packages/common/enums/http-status.enum";
import { RouteParamtypes } from "@/packages/common/enums/route-paramtypes.enum";
import { HTTP_METHOD_MAP } from "./interfaces/http-method-map";

/**
 * 路由探索器类
 * 负责：
 * 1. 扫描模块中的控制器
 * 2. 解析控制器中的路由装饰器
 * 3. 注册路由处理器
 * 4. 处理路由参数和响应
 */
export class RouterExplorer {
   constructor(
      private readonly app: Express,
      private readonly providerCollector: ProviderCollector,
      private readonly handleException: (
         error: any,
         context: any
      ) => Promise<void>
   ) {}

   /**
    * 探索并注册模块中所有控制器的路由
    * @param module - 包含控制器的模块
    */
   public explore(module: any) {
      // 获取当前模块的控制器
      const controllers =
         Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, module) || [];

      // 获取导入的模块
      const imports =
         Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) || [];

      // 注册当前模块的控制器路由
      for (const Controller of controllers) {
         this.registerControllerRoutes(Controller);
      }

      // 递归处理导入模块的控制器
      for (const importedModule of imports) {
         this.explore(importedModule);
      }

      Logger.log(`Routes explored and registered`, "RouterExplorer");
   }

   /**
    * 注册单个控制器的所有路由
    * @param Controller - 控制器类
    */
   private registerControllerRoutes(Controller: any) {
      // 获取控制器的依赖并实例化
      const providerDependencies = this.getProviderDependencies(Controller);
      const controllerInstance =
         this.providerCollector.getProvider(Controller) ||
         new Controller(...providerDependencies);

      // 获取控制器的基础路径
      const prefix = Reflect.getMetadata("prefix", Controller) || "";
      Logger.log(`${Controller.name} {${prefix}}`, "RoutesResolver");

      // 遍历控制器原型上的所有方法
      const controllerPrototype = Controller.prototype;

      for (const propName of Object.getOwnPropertyNames(controllerPrototype)) {
         const method = controllerPrototype[propName];
         const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);
         const httpCodeMetadata = Reflect.getMetadata(
            HTTP_CODE_METADATA,
            method
         );
         const pathMetadata = Reflect.getMetadata(PATH_METADATA, method);
         const redirectURLMetadata = Reflect.getMetadata(
            REDIRECT_METADATA,
            method
         );
         const headers = Reflect.getMetadata(HEADERS_METADATA, method);

         // 跳过非路由方法
         if (httpMethod === undefined) {
            continue;
         }

         // 构建完整的路由路径
         const routePath = path.posix.join(
            "/",
            prefix || "",
            pathMetadata || ""
         );
         const methodName = HTTP_METHOD_MAP[httpMethod];
         if (!methodName) {
            continue;
         }

         // 注册路由处理器
         this.registerRoute(
            controllerInstance,
            propName,
            method,
            routePath,
            methodName,
            httpCodeMetadata,
            redirectURLMetadata,
            headers
         );
      }
   }

   /**
    * 注册单个路由处理器
    * @param controller - 控制器实例
    * @param propName - 方法名
    * @param method - 方法函数
    * @param routePath - 路由路径
    * @param methodName - HTTP 方法名
    * @param httpCodeMetadata - HTTP 状态码
    * @param redirectURLMetadata - 重定向 URL
    * @param headers - 响应头
    */
   private registerRoute(
      controller: any,
      propName: string,
      method: Function,
      routePath: string,
      methodName: string,
      httpCodeMetadata: number,
      redirectURLMetadata: string,
      headers: any
   ) {
      this.app[methodName](
         routePath,
         async (
            req: ExpressRequest,
            res: ExpressResponse,
            next: NextFunction
         ) => {
            const context = this.createCunstomParamFactoryContext(
               req,
               res,
               next
            );
            try {
               // 解析路由参数
               const args = this.resolveRouteArgs(
                  controller,
                  propName,
                  req,
                  res,
                  next
               );
               const result = await method.call(controller, ...args);

               // 设置响应状态码
               if (httpCodeMetadata) {
                  res.statusCode = httpCodeMetadata;
               } else if (methodName === "post") {
                  res.statusCode = 201;
               }

               // 处理重定向
               if (result?.url) {
                  return res.redirect(result.statusCode || 302, result.url);
               }
               if (redirectURLMetadata) {
                  return res.redirect(
                     httpCodeMetadata || HttpStatus.FOUND,
                     redirectURLMetadata
                  );
               }

               // 发送响应
               const wasUsedResponseMetadata = this.getReqponseOrNextMetadata(
                  controller,
                  propName
               );
               if (
                  !wasUsedResponseMetadata ||
                  wasUsedResponseMetadata?.data?.passthrough
               ) {
                  const _headers = new Headers(headers);
                  res.setHeaders(_headers);
                  return res.send(result);
               }
            } catch (error) {
               await this.handleException(error, context);
            }
         }
      );

      Logger.log(
         `Mapped {${routePath}, ${methodName.toUpperCase()}} route`,
         "RouterExplorer"
      );
   }

   /**
    * 解析路由参数
    * 包括标准参数和自定义参数
    */
   private resolveRouteArgs(
      controller: any,
      propName: string,
      req: ExpressRequest,
      res: ExpressResponse,
      next: NextFunction
   ) {
      const params = this.resolveParams(controller, propName, req, res, next);
      const customParams = this.resolveCustomParamFactory(
         controller,
         propName,
         req,
         res,
         next
      );
      return [...params, ...customParams];
   }

   /**
    * 解析标准路由参数
    * 包括：请求对象、响应对象、查询参数、请求体、请求头等
    */
   private resolveParams(
      instance: any,
      methodName: string,
      req: ExpressRequest,
      res: ExpressResponse,
      next: NextFunction
   ) {
      const paramsMetaData =
         Reflect.getMetadata(ROUTE_ARGS_METADATA, instance, methodName) || [];

      return paramsMetaData.map((paramMetadata) => {
         const { key, data } = paramMetadata;

         switch (key) {
            case RouteParamtypes.REQUEST:
               return req;
            case RouteParamtypes.RESPONSE:
               return res;
            case RouteParamtypes.NEXT:
               return next;
            case RouteParamtypes.QUERY:
               return data ? req.query[data] : req.query;
            case RouteParamtypes.BODY:
               return data ? req.body[data] : req.body;
            case RouteParamtypes.HEADERS:
               return data ? req.headers[data] : req.headers;
            case RouteParamtypes.SESSION:
               return data ? req.session[data] : req.session;
            case RouteParamtypes.PARAM:
               return data ? req.params[data] : req.params;
            case RouteParamtypes.IP:
               return req.ip;
            default:
               return null;
         }
      });
   }

   /**
    * 解析自定义参数工厂
    * 用于处理自定义装饰器注入的参数
    */
   private resolveCustomParamFactory(
      instance: any,
      methodName: string,
      req: ExpressRequest,
      res: ExpressResponse,
      next: NextFunction
   ) {
      const customParamFactoryMetadata = Reflect.getMetadata(
         CUSTOM_ROUTE_ARGS_METADATA,
         instance,
         methodName
      );

      if (!customParamFactoryMetadata) {
         return [];
      }

      const results = [];
      const keys = Object.keys(customParamFactoryMetadata).sort((a, b) => {
         const indexA = parseInt(a.split(":")[1]);
         const indexB = parseInt(b.split(":")[1]);
         return indexA - indexB;
      });

      for (const metadata of keys) {
         const { key, data, factory } = customParamFactoryMetadata[metadata];
         if (key === CUSTOM_ROUTE_ARGS_METADATA) {
            const ctx = this.createCunstomParamFactoryContext(req, res, next);
            results.push(factory(data, ctx));
         }
      }
      return results;
   }

   /**
    * 创建自定义参数工厂的上下文对象
    * 提供对请求、响应和 next 函数的访问
    */
   private createCunstomParamFactoryContext(req: any, res: any, next: any) {
      return {
         switchToHttp: (): HttpArgumentsHost => ({
            getRequest: () => req,
            getResponse: () => res,
            getNext: () => next,
         }),
      };
   }

   /**
    * 检查控制器方法是否使用了 `@Res()` 或 `@Next()` 装饰器
    * @param controller - 控制器实例
    * @param methodName - 方法名
    * @returns 关于响应/next 使用的元数据或 undefined
    */
   private getReqponseOrNextMetadata(
      controller: Object | Function,
      methodName: string
   ) {
      const paramsMetadata =
         Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, methodName) || [];
      return paramsMetadata
         .filter(Boolean)
         .find(
            (param) =>
               param.key === RouteParamtypes.RESPONSE ||
               param.key === RouteParamtypes.NEXT
         );
   }

   /**
    * 获取提供者的依赖项
    * 用于控制器实例化时的依赖注入
    */
   private getProviderDependencies(provider: any) {
      const parserProvider =
         Reflect.getMetadata(PARAMTYPES_METADATA, provider) ?? [];
      return parserProvider.map((provider) => {
         return this.providerCollector.getProvider(provider);
      });
   }
}
