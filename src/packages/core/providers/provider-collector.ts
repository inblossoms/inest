import { isModule, isObject } from "@/packages/shared/shared.utils";
import {
   PARAMTYPES_METADATA,
   SELF_DECLARED_DEPS_METADATA,
} from "../../common/constants";
import { ModuleRegistry } from "../modules/module-registry";
import { Logger } from "../logger-server";

interface Provider {
   provide: any;
   useClass?: any;
   useValue?: any;
   useFactory?: (...args: any[]) => any;
   useExisting?: any;
   inject?: any[];
}

interface FilterProvider {
   provide: any;
   useClass?: any;
   useValue?: any;
   useFactory?: (...args: any[]) => any;
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
   private readonly providers = new Map<any, any>();

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
         this.providers.has(providerToken) &&
         (typeof provider !== "object" ||
            !("useValue" in provider) ||
            this.providers.get(providerToken) !== undefined)
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
            this.providers.set(providerToken, inst);
         } catch (error) {
            Logger.error(
               `An error occurred when instantiating the class ${String(
                  providerToken
               )}:`,
               error
            );
            this.providers.set(providerToken, null);
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
               this.providers.set(token, inst);
            } catch (error) {
               Logger.error(
                  `Error instantiating useClass provider ${String(token)}:`,
                  error
               );
               this.providers.set(token, null);
            }
         } else if ((provider as Provider).useValue !== undefined) {
            // useValue provider
            this.providers.set(token, (provider as Provider).useValue);
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
                        this.providers.set(token, resolvedInstance);
                     })
                     .catch((error) => {
                        Logger.error(
                           `Error resolving async useFactory provider ${String(
                              token
                           )}:`,
                           error
                        );
                        this.providers.set(token, null);
                     });
               } else {
                  this.providers.set(token, instance);
               }
            } catch (error) {
               Logger.error(
                  `Error executing useFactory provider ${String(token)}:`,
                  error
               );
               this.providers.set(token, null);
            }
         } else if ((provider as Provider).useExisting) {
            // 处理 useExisting 类型的提供者
            const existingProvider = this.resolveProvider(
               (provider as Provider).useExisting
            );
            this.providers.set(token, existingProvider);
         } else {
            // 处理未指定类型的提供者
            Logger.warn(
               `Provider ${String(token)} has no use* property`,
               String(provider)
            );
            this.providers.set(token, token);
         }
      } else if (typeof provider === "string" || typeof provider === "symbol") {
         // 处理字符串或符号类型的令牌
         // 这些通常是 @Inject() 装饰器使用的令牌
         // 不需要警告，因为这是预期的行为
         return;
      } else {
         // 处理意外的提供者定义
         Logger.warn("Unexpected provider definition:", provider);
      }
   }

   /**
    * 获取提供者的依赖项
    * 分析提供者类的元数据以找到其依赖
    * @param provider - 提供者类或函数
    * @param providerToken - 提供者令牌（用于日志）
    * @returns 解析后的依赖实例或值数组
    */
   public getProviderDependencies(provider: any, providerToken: any) {
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
      // 1. 检查本地 providers 映射
      if (this.providers.has(token)) {
         return this.providers.get(token);
      }

      // 2. 通过 ModuleRegistry 查找提供者定义
      const providerDefinition =
         this.moduleRegistry.findProviderDefinitionByToken(token);

      if (providerDefinition) {
         this.collectProviders(providerDefinition);
         if (this.providers.has(token)) {
            return this.providers.get(token);
         }
      }

      // 3. 如果是字符串，直接返回
      if (typeof token === "string") {
         return token;
      }

      // 4. 未找到提供者
      Logger.error(
         `resolveProvider: unable to resolve provider: ${String(token)}`
      );
      return undefined;
   }

   /**
    * 获取已解析的提供者实例或值
    * @param token - 提供者令牌
    * @returns 已收集的提供者实例或值
    */
   public getProvider(provider: any): any | undefined {
      return this.providers.get(provider);
   }

   public getProvidersByToken(token: string | symbol) {
      const providers: any[] = [];
      for (const [key, value] of this.providers.entries()) {
         if (key === token) {
            providers.push(value);
         }
      }
      return providers;
   }

   public collectProvider(provider: FilterProvider, module: any) {
      if (provider.provide && provider.useClass) {
         const dependencies = this.getProviderDependencies(
            provider.useClass,
            provider.provide
         );
         const instance = new provider.useClass(...dependencies);
         this.providers.set(provider.provide, instance);
         Logger.log(
            `Collected provider: ${provider.useClass.name}`,
            "ProviderCollector"
         );
      } else if (provider.provide && provider.useValue) {
         this.providers.set(provider.provide, provider.useValue);
         Logger.log(
            `Collected value provider: ${provider.provide.toString()}`,
            "ProviderCollector"
         );
      } else if (provider.provide && provider.useFactory) {
         const dependencies = provider.inject
            ? provider.inject.map((token) => this.getProvider(token))
            : [];
         const instance = provider.useFactory(...dependencies);
         this.providers.set(provider.provide, instance);
         Logger.log(
            `Collected factory provider: ${provider.provide.toString()}`,
            "ProviderCollector"
         );
      }
   }
}
