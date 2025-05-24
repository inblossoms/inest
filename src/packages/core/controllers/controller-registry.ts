import { Logger } from "../logger-server";
import { ProviderCollector } from "../providers/provider-collector";
import { ExceptionFilterManager } from "../exceptions/exception-filter-manager";
import { EXCEPTION_FILTERS_METADATA } from "@/packages/common/constants";

/**
 * 控制器注册器类
 * 负责：
 * 1. 初始化模块中的控制器
 * 2. 将控制器提交给 ProviderCollector 进行依赖注入
 * 3. 管理控制器的生命周期
 */
export class ControllerRegistry {
   constructor(
      private readonly providerCollector: ProviderCollector,
      private readonly exceptionFilterManager?: ExceptionFilterManager
   ) {}

   /**
    * 初始化模块中的所有控制器
    * 将控制器提交给 ProviderCollector 进行依赖注入
    * @param controllers - 包含控制器的数组
    */
   public async initializeControllers(controllers: any[]) {
      if (!this.providerCollector) {
         Logger.error("ProviderCollector not initialized");
      }

      for (const controller of controllers) {
         try {
            Logger.log(
               `Initializing controller: ${String(
                  controller.name ?? controller
               )}`,
               "ControllerRegistry"
            );
            // provider 的依赖注入
            await this.providerCollector.collectProviders(controller);

            // 控制器的收集注册
            if (this.exceptionFilterManager) {
               // 控制器级过滤器
               const controllerExceptionFilters =
                  Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, controller) ||
                  [];
               controllerExceptionFilters.forEach((filter) => {
                  this.exceptionFilterManager.addExceptionFilter(filter);
               });

               // 方法级过滤器
               const prototype = controller.prototype;
               for (const propName of Object.getOwnPropertyNames(prototype)) {
                  const method = prototype[propName];
                  if (typeof method !== "function") continue;
                  const methodExceptionFilters =
                     Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, method) ||
                     [];
                  methodExceptionFilters.forEach((filter) => {
                     this.exceptionFilterManager.addExceptionFilter(filter);
                  });
               }
            }
         } catch (error) {
            Logger.error(
               `Error initializing controller ${String(
                  controller.name ?? controller
               )}:`,
               error instanceof Error ? error.stack : String(error),
               "ControllerRegistry"
            );
            throw error;
         }
      }
   }
}
