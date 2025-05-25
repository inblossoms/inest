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
         throw new Error("ProviderCollector not initialized");
      }

      if (this.isDynamicModule(module)) {
         await this.registerDynamicModule(module, ...parentModules);
         return;
      }

      if (this.ModuleProviders.has(module)) {
         return;
      }

      this.ModuleProviders.set(module, new Set());

      // 检查模块的元数据
      const moduleMetadata = Reflect.getMetadata(
         MODULE_METADATA.PROVIDERS,
         module
      );
      const isGlobalProviderModule =
         Reflect.getMetadata(GLOBAL_MODULE_METADATA, module) === true;

      const importedProviders: Provider[] = moduleMetadata ?? [];
      const moduleExports =
         Reflect.getMetadata(MODULE_METADATA.EXPORTS, module) ?? [];
      const moduleImports =
         Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) ?? [];

      // 1. 处理导入的模块
      for (const importModule of moduleImports) {
         try {
            if (this.isDynamicModule(importModule)) {
               await this.registerDynamicModule(
                  importModule,
                  module,
                  ...parentModules
               );
            } else if (isModule(importModule)) {
               await this.registerModule(
                  importModule,
                  module,
                  ...parentModules
               );
            }
         } catch (error) {
            throw error;
         }
      }

      // 3. 处理导出的模块和提供者
      for (const moduleOrProvide of moduleExports) {
         try {
            if (!isModule(moduleOrProvide)) {
               const moduleProvider = importedProviders.find((provider) => {
                  const providerToken =
                     typeof provider === "object" &&
                     provider !== null &&
                     "provide" in provider
                        ? provider.provide
                        : provider;
                  return providerToken === moduleOrProvide;
               });

               if (moduleProvider) {
                  // 如果是全局模块，添加到全局提供者集合
                  if (isGlobalProviderModule) {
                     this.GlobalProviders.add(moduleOrProvide);
                  }

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
            throw error;
         }
      }

      // 2. 处理模块自身的提供者
      for (const provider of importedProviders) {
         try {
            const providerToken =
               typeof provider === "object" &&
               provider !== null &&
               "provide" in provider
                  ? provider.provide
                  : provider;

            if (isGlobalProviderModule) {
               this.GlobalProviders.add(providerToken);
            }

            // 注册提供者
            this.registerProviderInModules(provider, isGlobalProviderModule, [
               module,
            ]);
         } catch (error) {
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
         typeof provider === "object" &&
         provider !== null &&
         "provide" in provider
            ? provider.provide
            : provider;

      modulesToRegisterIn.forEach((_module_) => {
         const moduleProviders = this.ModuleProviders.get(_module_);
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

      modulesToAddTo.forEach((_module_) => {
         const moduleProviders = this.ModuleProviders.get(_module_);
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
         throw new Error("Invalid dynamic module configuration");
      }

      const {
         module: dynamicModuleClass,
         imports,
         providers,
         controllers,
         exports,
      } = dynamicModuleConfig;

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

      const mergedModuleConfig = {
         controllers: [...(controllers ?? []), ...existingControllers],
         providers: [...(providers ?? []), ...existingProviders],
         imports: [...(imports ?? []), ...existingImports],
         exports: [...(exports ?? []), ...existingExports],
      };

      Module(mergedModuleConfig)(dynamicModuleClass);

      const dynamicProviders = dynamicModuleConfig.providers ?? [];
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

   /**
    * 在模块链中查找提供者
    * 按照优先级顺序查找：
    * 1. 当前模块
    * 2. 导入的模块
    * 3. 全局提供者
    * @param token - 提供者令牌
    * @param module - 当前模块
    * @returns 找到的提供者定义
    */
   public findProviderInModuleChain(token: any, module: any): any {
      console.log("ModuleProviders: ", this.ModuleProviders);
      console.log("GlobalProviders: ", this.GlobalProviders);
      console.log("providerDefinitions: ", this.providerDefinitions);

      // 1. 检查当前模块的提供者定义
      const currentModuleProviders = this.ModuleProviders.get(module);
      if (currentModuleProviders?.has(token)) {
         const providerDefinition = this.providerDefinitions.get(token);
         if (providerDefinition) {
            return providerDefinition;
         }
      }

      // 2. 检查导入的模块
      const moduleImports =
         Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) ?? [];
      for (const importedModule of moduleImports) {
         const importedModuleProviders =
            this.ModuleProviders.get(importedModule);
         if (importedModuleProviders?.has(token)) {
            const providerDefinition = this.providerDefinitions.get(token);
            if (providerDefinition) {
               return providerDefinition;
            }
         }
      }

      // 3. 检查全局提供者
      if (this.GlobalProviders.has(token)) {
         const providerDefinition = this.providerDefinitions.get(token);
         if (providerDefinition) {
            return providerDefinition;
         }
      }

      return undefined;
   }
}
