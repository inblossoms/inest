import { Logger } from "../logger-server";
import { RequestMethod } from "@/packages/common/enums/request-method.enum";
import { MODULE_METADATA } from "@/packages/common/constants";
import { ProviderCollector } from "../providers/provider-collector";

/**
 * HTTP 方法映射表
 * 将 RequestMethod 枚举映射到 Express 的方法名
 */
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
 * 控制器注册器类
 * 负责：
 * 1. 初始化模块中的控制器
 * 2. 将控制器提交给 ProviderCollector 进行依赖注入
 * 3. 管理控制器的生命周期
 */
export class ControllerRegistry {
   constructor(private readonly providerCollector: ProviderCollector) {}

   /**
    * 初始化模块中的所有控制器
    * 将控制器提交给 ProviderCollector 进行依赖注入
    * @param controllers - 包含控制器的数组
    */
   public async initializeControllers(controllers: any[]) {
      if (!this.providerCollector) {
         throw new Error("ProviderCollector not initialized");
      }

      for (const controller of controllers) {
         try {
            Logger.log(
               `Initializing controller: ${String(
                  controller.name ?? controller
               )}`,
               "ControllerRegistry"
            );
            await this.providerCollector.collectProviders(controller);
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
