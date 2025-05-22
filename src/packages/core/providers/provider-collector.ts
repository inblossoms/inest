import { isModule, isObject } from "@/packages/shared/shared.utils";
import {
   PARAMTYPES_METADATA,
   SELF_DECLARED_DEPS_METADATA,
} from "../../common/constants";
import { ModuleRegistry } from "../modules/module-registry";

interface Provider {
   provide: any;
   useClass?: any;
   useValue?: any;
   useFactory?: (...args: any[]) => any;
   useExisting?: any;
   inject?: any[];
}

/**
 * 提供者收集器类
 * 负责：
 * 1. 实例化提供者
 * 2. 解析提供者依赖
 * 3. 管理提供者实例
 * 4. 处理不同类型的提供者（类、工厂、值等）
 */
export class ProviderCollector {
   /** 提供者实例映射表 provider[token]: instance */
   private readonly Modules = new Map<any, any>();

   constructor(private readonly moduleRegistry: ModuleRegistry) {}

   /**
    * 收集并处理提供者定义
    * 根据提供者类型进行不同的处理：
    * - 类提供者：实例化类
    * - 工厂提供者：执行工厂函数
    * - 值提供者：直接使用值
    * @param provider - 提供者定义（类、工厂、值等）
    */
   public collectProviders(provider: any) {
      // 确定提供者令牌
      const providerToken =
         isObject(provider) && "provide" in provider
            ? provider.provide
            : provider;

      // 如果 provider 已经处理过（被收集），直接返回
      if (
         this.Modules.has(providerToken) &&
         (typeof provider !== "object" ||
            !("useValue" in provider) ||
            this.Modules.get(providerToken) !== undefined)
      ) {
         return;
      }

      // 处理不同类型的提供者
      if (isModule(provider)) {
         // 处理语法糖 provider
         const providerDependencies = this.getProviderDependencies(
            provider,
            providerToken
         );
         try {
            const inst = new provider(...providerDependencies);
            this.Modules.set(providerToken, inst);
         } catch (error) {
            console.error(`实例化类 ${String(providerToken)} 时出错:`, error);
            this.Modules.set(providerToken, null);
         }
      } else if (isObject(provider) && "provide" in provider) {
         // 处理对象形式的提供者定义
         const token = (provider as Provider).provide;

         if ((provider as Provider).useClass) {
            // 处理 useClass 类型的提供者
            const providerDependencies = this.getProviderDependencies(
               (provider as Provider).useClass,
               token
            );
            try {
               const inst = new (provider as Provider).useClass(
                  ...providerDependencies
               );
               this.Modules.set(token, inst);
            } catch (error) {
               console.error(
                  `Error instantiating useClass provider ${String(token)}:`,
                  error
               );
               this.Modules.set(token, null);
            }
         } else if ((provider as Provider).useValue !== undefined) {
            // useValue provider
            this.Modules.set(token, (provider as Provider).useValue);
         } else if ((provider as Provider).useFactory) {
            // useFactory provider
            const injects = (provider as Provider).inject ?? [];
            const parsedTokenValues = injects.map((injectToken) =>
               //>inject 注入的内容可以是常量值，也可以是 provider 注入的 Token
               this.resolveProvider(injectToken)
            );
            try {
               const instance = (provider as Provider).useFactory(
                  ...parsedTokenValues
               );
               if (instance instanceof Promise) {
                  instance
                     .then((resolvedInstance) => {
                        this.Modules.set(token, resolvedInstance);
                     })
                     .catch((error) => {
                        console.error(
                           `Error resolving async useFactory provider ${String(
                              token
                           )}:`,
                           error
                        );
                        this.Modules.set(token, null);
                     });
               } else {
                  this.Modules.set(token, instance);
               }
            } catch (error) {
               console.error(
                  `Error executing useFactory provider ${String(token)}:`,
                  error
               );
               this.Modules.set(token, null);
            }
         } else if ((provider as Provider).useExisting) {
            // 处理 useExisting 类型的提供者
            const existingProvider = this.resolveProvider(
               (provider as Provider).useExisting
            );
            this.Modules.set(token, existingProvider);
         } else {
            // 处理未指定类型的提供者
            console.warn(
               `Provider ${String(token)} has no use* property`,
               provider
            );
            this.Modules.set(token, token);
         }
      } else {
         // 处理意外的提供者定义
         console.warn("Unexpected provider definition:", provider);
      }
   }

   /**
    * 获取提供者的依赖项
    * 分析提供者类的元数据以找到其依赖
    * @param provider - 提供者类或函数
    * @param providerToken - 提供者令牌（用于日志）
    * @returns 解析后的依赖实例或值数组
    */
   private getProviderDependencies(provider: any, providerToken: any) {
      if (typeof provider !== "function") {
         console.warn(
            `Attempting to get dependencies for non-class provider: ${String(
               providerToken
            )}`,
            provider
         );
         return [];
      }

      // 获取构造函数参数类型元数据
      const paramtypes =
         Reflect.getMetadata(PARAMTYPES_METADATA, provider) ?? [];
      // 获取自定义依赖元数据
      const selfDeclaredDeps =
         Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, provider) ?? [];

      return paramtypes.map((paramtype: any, index: number) => {
         // 查找此参数位置的自定义依赖
         const matchedSelfDeclaredDep = selfDeclaredDeps.find(
            (dep: any) => dep.index === index
         );

         // 使用自定义依赖令牌或参数类型
         const token = matchedSelfDeclaredDep?.param ?? paramtype;

         // 解析依赖
         return this.resolveProvider(token);
      });
   }

   /**
    * 解析提供者令牌
    * 将令牌解析为对应的实例或值
    * @param token - 提供者令牌
    * @returns 解析后的提供者实例或值
    */
   public resolveProvider(token: any): any {
      // 1. 检查本地 Modules 映射
      if (this.Modules.has(token)) {
         return this.Modules.get(token);
      }

      // 2. 通过 ModuleRegistry 查找提供者定义
      const providerDefinition =
         this.moduleRegistry.findProviderDefinitionByToken(token);

      if (providerDefinition) {
         this.collectProviders(providerDefinition);
         if (this.Modules.has(token)) {
            return this.Modules.get(token);
         }
      }

      // 3. 如果是字符串，直接返回
      if (typeof token === "string") {
         return token;
      }

      // 4. 未找到提供者
      console.error(
         `resolveProvider: unable to resolve provider: ${String(token)}`
      );
      return undefined;
   }

   /**
    * 获取已解析的提供者实例或值
    * @param token - 提供者令牌
    * @returns 已收集的提供者实例或值
    */
   public getProvider(token: any): any | undefined {
      return this.Modules.get(token);
   }
}
