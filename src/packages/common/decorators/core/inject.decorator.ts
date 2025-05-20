import "reflect-metadata";
import { isUndefined } from "@/packages/shared/shared.utils";
import {
   MODULE_PROVIDERS,
   PARAMTYPES_METADATA,
   PROPERTY_DEPS_METADATA,
   SELF_DECLARED_DEPS_METADATA,
} from "../../constants";
import { ForwardReference, InjectionToken } from "../../interfaces/modules";

/**
 * @Inject 装饰器用于标记构造函数参数或类属性，使其成为依赖注入的目标
 * 该装饰器支持以下功能：
 * 1. 构造函数参数注入
 * 2. 属性注入
 * 3. 支持自定义注入令牌
 */
export function Inject(
   token?: InjectionToken | ForwardReference // 可选的注入令牌参数
): PropertyDecorator & ParameterDecorator {
   // 返回一个同时支持属性和参数装饰器的函数
   // 检查装饰器是否被调用时传入了参数
   const injectCallHasArguments = arguments.length > 0;

   // 返回装饰器函数
   return (
      target: object, // 装饰器目标对象
      key: string | symbol | undefined, // 属性名或符号
      index?: number // 参数索引（仅在参数装饰器中使用）
   ) => {
      const existingProvider =
         Reflect.getMetadata(MODULE_PROVIDERS, target) || [];
      existingProvider[index] = token;
      Reflect.defineMetadata(MODULE_PROVIDERS, existingProvider, target);

      //* 1.自定义 Provider： 获取注入类型，优先使用传入的token，否则尝试从元数据中获取
      let type = token || Reflect.getMetadata("design:type", target, key!);

      //* 2.标准 Provider： 如果是构造函数注入且没有显式指定token，尝试从参数类型元数据中获取
      if (!type && !injectCallHasArguments) {
         type = Reflect.getMetadata(PARAMTYPES_METADATA, target, key!)?.[
            index!
         ];
      }

      //? 1. 处理构造函数参数注入的情况
      if (!isUndefined(index)) {
         // 获取已存在的自声明依赖列表，如果不存在则初始化为空数组
         let dependencies =
            Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];

         // 添加新的依赖信息到列表中
         dependencies = [...dependencies, { index, param: type }];

         // 将更新后的依赖列表保存到元数据中
         Reflect.defineMetadata(
            SELF_DECLARED_DEPS_METADATA,
            dependencies,
            target
         );
         return;
      }

      //? 2. 处理属性注入的情况
      // 获取已存在的属性依赖列表，如果不存在则初始化为空数组
      let properties =
         Reflect.getMetadata(PROPERTY_DEPS_METADATA, target.constructor) || [];

      // 添加新的属性依赖信息到列表中
      properties = [...properties, { key, type }];

      // 调试日志，输出注入的属性信息
      // 将更新后的属性依赖列表保存到元数据中
      Reflect.defineMetadata(
         PROPERTY_DEPS_METADATA,
         properties,
         target.constructor
      );
   };
}
