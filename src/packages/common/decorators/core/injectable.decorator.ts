import { INJECTABLE_WATERMARK, SCOPE_OPTIONS_METADATA } from "../../constants";
import { ScopeOptions } from "../../interfaces/scope-options.interface";

export type InjectableOptions = ScopeOptions;

export function Injectable(options?: InjectableOptions): ClassDecorator {
   return (target: object) => {
      // todo：只有标记了 injectable 的 service 才可以做为服务
      Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target); // 给类的定义添加可注入标记

      Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options, target);
   };
}
