import { ProviderCollector } from "@/packages/core/providers/provider-collector";
import {
   GLOBAL_MODULE_METADATA,
   MODULE_METADATA,
} from "@/packages/common/constants";
import { Module } from "@/packages/common/index";
import { Provider } from "@/packages/common/interfaces/modules/provider.interface";
import { Logger } from "@/packages/core/logger-server";
import { isModule, isObject } from "@/packages/shared/shared.utils";

/**
 * 模块注册器类
 * 负责：
 * 1. 注册和管理应用程序中的模块
 * 2. 处理模块的导入和导出
 * 3. 管理提供者定义
 * 4. 处理动态模块
 */
export class ModuleRegistry {
   /** 模块提供者映射表 module: Set<provider token> */
   private readonly ModuleProviders = new Map<any, Set<any>>();
   /** 全局提供者令牌集合*/
   private readonly GlobalProviders = new Set<any>();
   /** 提供者定义映射表 token: definition， */
   private readonly providerDefinitions = new Map<any, any>();
   /** ProviderCollector 实例 */
   private providerCollector: ProviderCollector;

   constructor() {}

   /**
    * 设置 ProviderCollector 实例
    * @param providerCollector - ProviderCollector 实例
    */
   public setProviderCollector(providerCollector: ProviderCollector) {
      this.providerCollector = providerCollector;
   }

   /**
    * 注册模块及其提供者
    * 处理模块的导入、提供者和导出
    * @param module - 要注册的模块
    * @param parentModules - 导入此模块的父模块列表
    */
   public async registerModule(module: any, ...parentModules: any[]) {
      if (!this.providerCollector) {
         Logger.error("ProviderCollector not initialized");
      }

      // 处理动态模块
      if (this.isDynamicModule(module)) {
         await this.registerDynamicModule(module, ...parentModules);
         return;
      }

      // 检查模块是否已注册
      if (this.ModuleProviders.has(module)) {
         return;
      }

      // 确保模块的提供者集合存在
      this.ModuleProviders.set(module, new Set());

      // 检查是否为全局模块
      const isGlobalProviderModule = Reflect.getMetadata(
         GLOBAL_MODULE_METADATA,
         module
      );

      // 获取模块元数据
      const importedProviders: Provider[] =
         Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) ?? [];
      const moduleExports =
         Reflect.getMetadata(MODULE_METADATA.EXPORTS, module) ?? [];
      const moduleImports =
         Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) ?? [];

      // 1. 处理导入的模块
      for (const importModule of moduleImports) {
         try {
            if (this.isDynamicModule(importModule)) {
               Logger.log(
                  `Registering dynamic import: ${String(
                     importModule.module?.name ?? importModule
                  )} in ${module.name ?? "unknown module"}`,
                  "ModuleRegistry"
               );
               await this.registerDynamicModule(
                  importModule,
                  module,
                  ...parentModules
               );
            } else if (isModule(importModule)) {
               Logger.log(
                  `Registering static import: ${String(
                     importModule.name ?? importModule
                  )} in ${module.name ?? "unknown module"}`,
                  "ModuleRegistry"
               );
               await this.registerModule(
                  importModule,
                  module,
                  ...parentModules
               );
            }
         } catch (error) {
            Logger.error(
               `Error processing import ${String(
                  importModule.name ?? importModule
               )} in module ${module.name ?? "unknown module"}:`,
               error instanceof Error ? error.stack : String(error),
               "ModuleRegistry"
            );
            throw error;
         }
      }

      // 2. 处理模块自身的 provider
      for (const provider of importedProviders) {
         try {
            const providerToken =
               isObject(provider) && "provide" in provider
                  ? provider.provide
                  : provider;
            this.registerProviderInModules(
               providerToken,
               isGlobalProviderModule,
               [module]
            );
         } catch (error) {
            Logger.error(
               `Processing provider ${String(provider)} in module ${
                  module.name ?? "Unknown module"
               } : `,
               error instanceof Error ? error.stack : String(error),
               "ModuleRegistry"
            );
            throw error;
         }
      }

      // 3. 处理导出的 module 和 provider
      for (const moduleOrProvide of moduleExports) {
         try {
            const exportToken = moduleOrProvide.name ?? moduleOrProvide;
            Logger.log(
               `Processing export: ${String(exportToken)} from ${
                  module.name ?? "unknown module"
               }`,
               "ModuleRegistry"
            );
            // 主体逻辑
            if (!isModule(moduleOrProvide)) {
               const moduleProvider = importedProviders.find((provider) => {
                  const providerToken =
                     isObject(provider) && "provide" in provider
                        ? provider.provide
                        : provider;
                  return providerToken === moduleOrProvide;
               });

               if (moduleProvider) {
                  this.addProviderTokenToModules(
                     moduleOrProvide,
                     isGlobalProviderModule,
                     [...parentModules]
                  );
                  // 存储提供者定义
                  if (!this.providerDefinitions.has(moduleOrProvide)) {
                     this.providerDefinitions.set(
                        moduleOrProvide,
                        moduleProvider
                     );
                  }
                  // 确保提供者被收集
                  this.providerCollector.collectProviders(moduleProvider);
               }
            } else {
               await this.registerModule(moduleOrProvide, ...parentModules);
            }
         } catch (error) {
            const exportToken = moduleOrProvide.name ?? moduleOrProvide;
            Logger.error(
               `Error processing export ${String(exportToken)} from module ${
                  module.name ?? "unknown module"
               }:`,
               error instanceof Error ? error.stack : String(error),
               "ModuleRegistry"
            );
            throw error;
         }
      }
   }

   /**
    * 将提供者注册到指定模块中
    * @param provider - 提供者定义
    * @param isGlobalProvider - 是否为全局提供者
    * @param modulesToRegisterIn - 要注册提供者的模块列表
    */
   private registerProviderInModules(
      provider: any,
      isGlobalProvider: boolean,
      modulesToRegisterIn: any[]
   ) {
      if (!provider) return;

      const providerToken =
         isObject(provider) && "provide" in provider
            ? provider.provide
            : provider;

      modulesToRegisterIn.forEach((module) => {
         const moduleProviders = this.ModuleProviders.get(module);
         if (moduleProviders) {
            moduleProviders.add(providerToken);
         }

         if (isGlobalProvider) {
            this.GlobalProviders.add(providerToken);
         }
      });

      // 存储提供者定义
      if (!this.providerDefinitions.has(providerToken)) {
         this.providerDefinitions.set(providerToken, provider);
      }

      this.providerCollector.collectProviders(provider);
   }

   /**
    * 将提供者令牌添加到指定模块中
    * @param providerToken - 提供者令牌
    * @param isGlobalProvider - 是否为全局提供者
    * @param modulesToAddTo - 要添加令牌的模块列表
    */
   private addProviderTokenToModules(
      providerToken: any,
      isGlobalProvider: boolean,
      modulesToAddTo: any[]
   ) {
      if (!providerToken) return;

      modulesToAddTo.forEach((module) => {
         const moduleProviders = this.ModuleProviders.get(module);
         if (moduleProviders) {
            moduleProviders.add(providerToken);
         }
         if (isGlobalProvider) {
            this.GlobalProviders.add(providerToken);
         }
      });
   }

   /**
    * 检查是否为动态模块
    * @param entity - 要检查的实体
    * @returns 是否为动态模块
    */
   public isDynamicModule(entity: any): boolean {
      return (
         (entity && typeof entity === "object" && "module" in entity) ||
         entity instanceof Promise
      );
   }

   /**
    * 注册动态模块
    * @param dynamicModuleConfigOrPromise - 动态模块配置或 Promise
    * @param parentModules - 导入此动态模块的父模块列表
    */
   public async registerDynamicModule(
      dynamicModuleConfigOrPromise: any,
      ...parentModules: any[]
   ) {
      if (!this.providerCollector) {
         throw new Error("ProviderCollector not initialized");
      }

      let dynamicModuleConfig = dynamicModuleConfigOrPromise;
      if (dynamicModuleConfigOrPromise instanceof Promise) {
         dynamicModuleConfig = await dynamicModuleConfigOrPromise;
      }

      if (!dynamicModuleConfig || !dynamicModuleConfig.module) {
         console.error(
            "Invalid dynamic module configuration:",
            dynamicModuleConfig
         );
         return;
      }

      const {
         module: dynamicModuleClass,
         imports,
         providers,
         controllers,
         exports,
      } = dynamicModuleConfig;

      // 获取现有元数据
      const existingControllers =
         Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, dynamicModuleClass) ??
         [];
      const existingProviders =
         Reflect.getMetadata(MODULE_METADATA.PROVIDERS, dynamicModuleClass) ??
         [];
      const existingImports =
         Reflect.getMetadata(MODULE_METADATA.IMPORTS, dynamicModuleClass) ?? [];
      const existingExports =
         Reflect.getMetadata(MODULE_METADATA.EXPORTS, dynamicModuleClass) ?? [];

      // 合并模块配置
      const mergedModuleConfig = {
         controllers: [...(controllers ?? []), ...existingControllers],
         providers: [...(providers ?? []), ...existingProviders],
         imports: [...(imports ?? []), ...existingImports],
         exports: [...(exports ?? []), ...existingExports],
      };

      Module(mergedModuleConfig)(dynamicModuleClass);

      // 处理动态模块的提供者
      const dynamicProviders = dynamicModuleConfig.providers ?? [];
      // 如果该动态模块是一个全局的 provider 则后续需要将其注入到 GlobalProviders 中
      const isGlobalDynamicModule = Reflect.getMetadata(
         GLOBAL_MODULE_METADATA,
         dynamicModuleClass
      );
      for (const provider of dynamicProviders) {
         this.registerProviderInModules(provider, isGlobalDynamicModule, [
            dynamicModuleClass,
            ...parentModules,
         ]);
      }

      // 注册模块本身
      await this.registerModule(dynamicModuleClass, ...parentModules);
   }

   /**
    * 获取模块的提供者令牌集合
    * @param module - 模块类
    * @returns 提供者令牌集合
    */
   public getModuleProviders(module: any): Set<any> | undefined {
      return this.ModuleProviders.get(module);
   }

   /**
    * 获取全局提供者令牌集合
    * @returns 全局提供者令牌集合
    */
   public getGlobalProviders(): Set<any> {
      return this.GlobalProviders;
   }

   /**
    * 根据令牌查找提供者定义
    * @param token - 提供者令牌
    * @returns 提供者定义
    */
   public findProviderDefinitionByToken(token: any): any | undefined {
      return this.providerDefinitions.get(token);
   }
}
