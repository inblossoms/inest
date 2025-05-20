import "reflect-metadata";

import type {
   Express,
   Request as ExpressRequest,
   Response as ExpressResponse,
   NextFunction,
} from "express";
import * as path from "node:path";
import * as express from "express";
import { Logger } from "./logger-server";
import { RouteParamtypes } from "../common/enums/route-paramtypes.enum";
import { RequestMethod } from "../common/enums/request-method.enum";
import { HttpStatus } from "../common/enums/http-status.enum";
import {
   CUSTOM_ROUTE_ARGS_METADATA,
   GLOBAL_MODULE_METADATA,
   HEADERS_METADATA,
   HTTP_CODE_METADATA,
   METHOD_METADATA,
   MODULE_ISOLATION,
   MODULE_METADATA,
   MODULE_PROVIDERS,
   PARAMTYPES_METADATA,
   PATH_METADATA,
   REDIRECT_METADATA,
   ROUTE_ARGS_METADATA,
   SELF_DECLARED_DEPS_METADATA,
} from "../common/constants";
import { HttpArgumentsHost } from "../common/interfaces/features/arguments-host.interface";
import { Provider } from "../common/interfaces/modules/provider.interface";
import { isModule } from "../shared/shared.utils";
import { Module } from "../common/index";

const HTTP_METHOD_MAP = {
   [RequestMethod.GET]: "get",
   [RequestMethod.POST]: "post",
   [RequestMethod.PUT]: "put",
   [RequestMethod.DELETE]: "delete",
   [RequestMethod.PATCH]: "patch",
   [RequestMethod.ALL]: "all",
   [RequestMethod.OPTIONS]: "options",
   [RequestMethod.HEAD]: "head",
} as const;

/**
 * NestApplication 类 - Nest.js 应用程序的核心类
 * 负责初始化应用程序、注册控制器、处理路由和依赖注入
 */
export class NestApplication {
   private readonly app: Express = express();
   // todo 每一个 Module 都应该通过一个 Module 工厂来生成其数据作用域容器
   //> 暂时实现
   /** 所有功能 Module 集合 module[provider][provide]: module */
   private readonly Modules = new Map();
   /** 单个 Module provider 集合 module: module[provider][provide] */
   private readonly ModuleProviders = new Map();
   private readonly GlobalProviders = new Set();

   /**
    * 创建新的 NestApplication 实例
    * @param module - 应用程序的根模块，包含所有控制器、提供者和导入的模块
    */
   constructor(protected readonly module) {
      this.bodyParser();
      this.registerProviders();

      this.app.use(function (req, res, next) {
         (req as any).user = { name: "roy", ID: "0024" };
         next();
      });
   }

   /**
    * 初始化应用程序
    * 1. 获取并注册所有控制器
    * 2. 为每个控制器注册其路由
    * 3. 启动应用程序
    */
   async init() {
      const controllers =
         Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, this.module) || [];
      Logger.log("AppModule dependencies initialized", "NestApplication");

      for (const Controller of controllers) {
         this.registerController(Controller);
      }

      Logger.log(`Nest application successfully started`, "NestApplication");
   }

   /**
    * 注册单个控制器
    * 1. 解析控制器的依赖项
    * 2. 实例化控制器
    * 3. 注册控制器的路由
    * @param Controller - 控制器类
    */
   private registerController(Controller: any) {
      const providerDependencies = this.getProviderDependencies(Controller);
      const controller = new Controller(...providerDependencies);
      const prefix = Reflect.getMetadata("prefix", Controller) || "";
      Logger.log(`${Controller.name} {${prefix}}`, "RoutesResolver");

      this.registerControllerRoutes(controller, Controller, prefix);
   }

   /**
    * 注册控制器的所有路由
    * 1. 遍历控制器的所有方法
    * 2. 获取每个方法的元数据（HTTP 方法、路径等）
    * 3. 注册路由处理器
    * @param controller - 控制器实例
    * @param Controller - 控制器类
    * @param prefix - 路由前缀
    */
   private registerControllerRoutes(
      controller: any,
      Controller: any,
      prefix: string
   ) {
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

         if (httpMethod === undefined) {
            continue;
         }

         const routePath = path.posix.join(
            "/",
            prefix || "",
            pathMetadata || ""
         );

         const methodName = HTTP_METHOD_MAP[httpMethod];
         if (!methodName) {
            continue;
         }

         this.registerRoute(
            controller,
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
    * 注册单个路由
    * 1. 创建路由处理器
    * 2. 处理请求参数
    * 3. 处理响应和重定向
    * @param controller - 控制器实例
    * @param propName - 方法名
    * @param method - 方法函数
    * @param routePath - 路由路径
    * @param methodName - HTTP 方法名
    * @param httpCodeMetadata - HTTP 状态码元数据
    * @param redirectURLMetadata - 重定向 URL 元数据
    * @param headers - 响应头元数据
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
            try {
               const args = this.resolveRouteArgs(
                  controller,
                  propName,
                  req,
                  res,
                  next
               );
               const result = await method.call(controller, ...args);

               if (httpCodeMetadata) {
                  res.statusCode = httpCodeMetadata;
               } else if (HTTP_METHOD_MAP[methodName] === "post") {
                  res.statusCode = 201;
               }

               if (result?.url) {
                  return res.redirect(result.statusCode || 302, result.url);
               }

               if (redirectURLMetadata) {
                  return res.redirect(
                     httpCodeMetadata || HttpStatus.FOUND,
                     redirectURLMetadata
                  );
               }

               const wasUsedResponseMetadata = this.getReqponseOrNextMetadata(
                  controller,
                  propName
               );
               /**
                * Nest检测到处理程序使用了 @Res() 或 @Next()时，表示您选择了特定库选项。
                  如果同时使用两种方法，则标准方法对这个单一路由将自动禁用，不再按预期工作。
                  要同时使用两种方法 (例如，仅注入响应对象以设置 cookies/headers，但仍将其余部分留给框架)，
                  必须在@Res((passthrough:true)) 装饰器中需设置 passthrough 选项为 true
                */
               if (
                  !wasUsedResponseMetadata ||
                  wasUsedResponseMetadata?.data?.passthrough
               ) {
                  const _headers = new Headers(headers);

                  res.setHeaders(_headers);
                  return res.send(result);
               }
            } catch (error) {
               next(error);
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
    * 1. 解析标准参数`（@Req, @Res 等）`
    * 2. 解析自定义参数`（@Param, @Query 等）`
    * @param controller - 控制器实例
    * @param propName - 方法名
    * @param req - Express 请求对象
    * @param res - Express 响应对象
    * @param next - Express next 函数
    * @returns 解析后的参数数组
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
    * 注册所有提供者
    * 1. 注册导入模块的提供者
    * 2. 注册根模块的提供者
    */
   private registerProviders() {
      this.registerImportedProviders();
      this.registerRootProviders();
   }

   /**
    * 注册导入模块的提供者
    * 处理所有导入的模块，包括动态模块和静态模块
    */
   private async registerImportedProviders() {
      const moduleImports =
         Reflect.getMetadata(MODULE_METADATA.IMPORTS, this.module) ?? [];

      for (const importModule of moduleImports) {
         if (this.isDynamicModule(importModule)) {
            // 处理异步动态模块
            if (importModule instanceof Promise) {
               const resolvedModule = await importModule;
               await this.registerDynamicModule(resolvedModule);
            } else {
               // 处理同步动态模块
               await this.registerDynamicModule(importModule);
            }
         } else {
            this.registerProvider(importModule, this.module);
         }
      }
   }

   /**
    * 注册根模块的提供者
    */
   private registerRootProviders() {
      const providers =
         Reflect.getMetadata(MODULE_METADATA.PROVIDERS, this.module) ?? [];
      for (const provider of providers) {
         this.collectProviders(provider, this.module);
      }
   }

   /**
    * 检查是否为动态模块
    * @param module - 要检查的模块
    * @returns 如果是动态模块返回 true，否则返回 false
    */
   private isDynamicModule(module: any): boolean {
      return module && typeof module === "object" && "module" in module;
   }

   /**
    * 注册动态模块
    * 1. 合并动态模块的配置
    * 2. 创建新的模块定义
    * 3. 注册提供者
    * @param dynamicModule - 动态模块配置
    */
   private async registerDynamicModule(dynamicModule: any) {
      if (!dynamicModule || !dynamicModule.module) {
         return;
      }

      const { module, imports, providers, controllers, exports } =
         dynamicModule;

      // 合并动态模块的配置
      const moduleConfig = this.mergeDynamicModuleConfig(module, {
         imports,
         providers,
         controllers,
         exports,
      });

      // 创建新的模块定义
      Module(moduleConfig);

      // 注册提供者
      this.registerProvider(module, this.module);
   }

   /**
    * 合并动态模块配置
    * 将动态模块的配置与模块自身的配置合并
    * @param module - 模块类
    * @param dynamicConfig - 动态配置
    * @returns 合并后的模块配置
    */
   private mergeDynamicModuleConfig(module: any, dynamicConfig: any) {
      return {
         controllers: [
            ...(dynamicConfig.controllers ?? []),
            ...(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, module) ?? []),
         ],
         providers: [
            ...(dynamicConfig.providers ?? []),
            ...(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) ?? []),
         ],
         imports: [
            ...(dynamicConfig.imports ?? []),
            ...(Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) ?? []),
         ],
         exports: [
            ...(dynamicConfig.exports ?? []),
            ...(Reflect.getMetadata(MODULE_METADATA.EXPORTS, module) ?? []),
         ],
      };
   }

   private name() {}

   /**
    * 注册模块及其提供者
    * 1. 注册模块的提供者
    * 2. 处理模块的导出
    * @param module - 要注册的模块
    * @param modules - 导入此模块的父模块
    */
   private registerProvider(module, ...modules) {
      // 检查当前 module 是否是一个全局 module
      const isGlobalProviderModule = Reflect.getMetadata(
         GLOBAL_MODULE_METADATA,
         module
      );
      const importedProviders =
         Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) ?? [];
      const moduleExports =
         Reflect.getMetadata(MODULE_METADATA.EXPORTS, module) ?? [];

      // 先处理当前模块的 providers
      for (const provider of importedProviders) {
         this.registerProviderToModules(provider, isGlobalProviderModule, [
            module,
            ...modules,
         ]);
      }

      // 再处理导出的模块或提供者
      for (const moduleOrProvide of moduleExports) {
         if (!isModule(moduleOrProvide)) {
            const moduleProvider = importedProviders.find((provider) => {
               return (
                  provider.provide === moduleOrProvide ||
                  provider === moduleOrProvide
               );
            });

            if (moduleProvider) {
               this.registerProviderToModules(
                  moduleProvider,
                  isGlobalProviderModule,
                  [module, ...modules]
               );
            }
         } else {
            this.registerProvider(moduleOrProvide, module, ...modules);
         }
      }
   }

   /**
    * 将提供者注册到多个模块中
    * @param provider - 要注册的提供者
    * @param isGlobalProviderModule - 是否为全局模块
    * @param modules - 需要注册提供者的模块数组
    */
   private registerProviderToModules(
      provider,
      isGlobalProviderModule,
      modules: any[]
   ) {
      modules.forEach((_module_) => {
         this.collectProviders(provider, _module_, isGlobalProviderModule);
      });
   }

   /**
    * 检查提供者是否已被收集，如果已收集则只建立依赖关系
    * @param provider - 要检查的提供者
    * @param providers - 提供者集合
    * @returns 如果提供者已被收集返回 true，否则返回 false
    */
   private checkAndCollectExistingProvider(
      provider,
      providers: Set<any>
   ): boolean {
      const injectProvider = provider.provide ?? provider;
      // 当多个导入模块提供同名服务时不会报错，但会根据导入模块在 imports 数组中的顺序从左到右来决定使用哪个服务。 基于此，会优先使用首先匹配到的服务。
      // 由于 providers 是 Set 类型，所以此功能也是符合预期的
      if (this.Modules.has(injectProvider)) {
         // 由于不同的服务模块可能依赖相同的 Module，所以只是 Modules 不搜集，每一个服务依旧需要建立于该 Module 的依赖关系
         providers.add(injectProvider);
         return true;
      }
      return false;
   }

   /**
    * 收集并实例化提供者
    * 1. 处理 useClass 提供者
    * 2. 处理 useValue 提供者
    * 3. 处理 useFactory 提供者
    * 4. 处理模块提供者
    * @param provider - 要收集的提供者
    * @param module - 提供者所属的模块
    * @param isGlobalProviderModule - 是否为全局模块，如果是则使用全局提供者集合
    */
   private collectProviders(provider, module, isGlobalProviderModule?) {
      const providers = isGlobalProviderModule
         ? this.GlobalProviders
         : this.ModuleProviders.get(module) || new Set();

      // 如果 Module 已经被收集，则不在收集
      if (this.checkAndCollectExistingProvider(provider, providers)) {
         return;
      }

      if (!this.ModuleProviders.has(module)) {
         this.ModuleProviders.set(module, providers);
      }

      if (provider.provide && provider.useClass) {
         const providerDependencies = this.getProviderDependencies(
            provider.useClass
         );
         const inst = new provider.useClass(...providerDependencies);
         this.Modules.set(provider.provide, inst);
         this.collectProvider(providers, provider.provide);
      } else if (provider.provide && provider.useValue) {
         this.Modules.set(provider.provide, provider.useValue);
         this.collectProvider(providers, provider.provide);
      } else if (provider.provide && provider.useFactory) {
         const injects = provider.inject ?? [];
         //>inject 注入的内容可以是常量值，也可以是 provider 注入的 Token
         const parsedTokenValues = injects.map((inject) =>
            this.parserParam(inject, module)
         );

         this.Modules.set(
            provider.provide,
            provider.useFactory(...parsedTokenValues)
         );
         this.collectProvider(providers, provider.provide);
      } else if (isModule(provider)) {
         const providerDependencies = this.getProviderDependencies(provider);
         this.Modules.set(provider, new provider(...providerDependencies));
         this.collectProvider(providers, provider);
      }
   }

   /**
    * 将提供者添加到模块的提供者集合中
    * @param providersSet - 模块的提供者集合
    * @param provide - 要添加的提供者令牌
    */
   private collectProvider(providersSet, provide) {
      providersSet.add(provide);
   }

   /**
    * 获取提供者的依赖项
    * 1. 获取提供者的依赖元数据
    * 2. 获取参数类型元数据
    * 3. 获取自定义依赖元数据
    * 4. 解析每个依赖项
    * @param provider - 要分析的提供者
    * @returns 解析后的依赖项数组
    */
   private getProviderDependencies(provider: Provider) {
      const parserProvider =
         Reflect.getMetadata(PARAMTYPES_METADATA, provider) ?? [];
      const paramTypes =
         Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, provider) ?? [];

      return parserProvider.map((provider, index) => {
         const module = Reflect.getMetadata(MODULE_ISOLATION, provider);
         // 查找匹配的 paramType
         const matchedParamType = paramTypes.find(
            (paramType) => paramType.index === index
         );

         // 如果找到匹配的 paramType，使用它；否则使用原始的 provider
         return this.parserParam(matchedParamType?.param ?? provider, module);
      });
   }

   /**
    * 从 Modules 中获取提供者实例
    * @param param - 提供者的 token
    * @returns 提供者的实例，如果不存在则返回 undefined
    */
   private getProviderInstance(param) {
      return this.Modules.get(param);
   }

   /**
    * 解析参数为其实际值
    * 1. 检查 Modules 中是否有实例
    * 2. 检查 ModuleProviders 中是否有实例
    * 3. 检查 GlobalProviders 中是否有实例
    * 4. 如果都没有，返回参数本身
    * @param param - 要解析的参数
    * @param module - 参数所属的模块
    * @returns 解析后的参数值
    */
   private parserParam(param, module) {
      // NestJS 通常不会因为服务名称相同而报错，而是会根据其依赖注入的解析规则来决定优先使用哪个服务。
      // 1.模块内部 provider 优先
      if (this.Modules.has(param)) {
         return this.getProviderInstance(param);
      }

      // 2.导入模块的 provider
      if (this.ModuleProviders.get(module)?.has(param)) {
         return this.getProviderInstance(param);
      }

      // 3.全局模块的 provider
      if (this.GlobalProviders.has(param)) {
         return this.getProviderInstance(param);
      }

      return param;
   }

   /**
    * 解析路由参数
    * 1. 获取参数元数据
    * 2. 根据参数类型解析对应的值
    * @param instance - 控制器实例
    * @param methodName - 方法名
    * @param req - Express 请求对象
    * @param res - Express 响应对象
    * @param next - Express next 函数
    * @returns 解析后的参数数组
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
            // case
            default:
               return null;
         }
      });
   }

   /**
    * 解析自定义参数工厂
    * 1. 获取自定义参数工厂元数据
    * 2. 按参数索引排序
    * 3. 执行工厂函数获取参数值
    * @param instance - 控制器实例
    * @param methodName - 方法名
    * @param req - Express 请求对象
    * @param res - Express 响应对象
    * @param next - Express next 函数
    * @returns 解析后的自定义参数数组
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
      //! 需要注意的是，参数装饰器的执行顺序 所以这里需要进行一次排序
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
    * @param req - Express 请求对象
    * @param res - Express 响应对象
    * @param next - Express next 函数
    * @returns 包含 HTTP 特定方法的上下文对象
    */
   private createCunstomParamFactoryContext(req, res, next) {
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
    * 设置请求体解析中间件
    * 1. JSON 解析
    * 2. URL 编码解析
    * 3. 文本解析
    */
   private bodyParser() {
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));
      this.app.use(express.text());
   }

   /**
    * 向 Express 应用程序添加中间件
    * @param args - 中间件参数
    * @returns NestApplication 实例，用于链式调用
    */
   public use(...args): this {
      this.app.use(...args);
      return this;
   }

   /**
    * 在指定端口启动 HTTP 服务器
    * @param port - 要监听的端口号
    */
   async listen(port: number) {
      this.init();

      this.app.listen(port, () => {
         Logger.log(
            `Application is running on http://localhost:${port}`,
            "NestApplication"
         );
      });
   }
}
