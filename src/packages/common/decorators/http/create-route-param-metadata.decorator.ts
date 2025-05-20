import {
   CUSTOM_ROUTE_ARGS_METADATA,
   ROUTE_ARGS_METADATA,
} from "../../constants";
import { CustomParamFactory } from "../../interfaces/features/create-route-paramm-metadata.decorator";

/** ParameterDecorator 是 TypeScript 中的一个内置类型，用于定义参数装饰器（Parameter Decorator）的类型
 * 
 * ```js
   type ParameterDecorator = (
      target: Object | Function,  // 对于实例方法是类的原型对象，对于静态方法是类的构造函数
      propertyKey: string | symbol,  // 被装饰的参数所在的方法的名称
      parameterIndex: number  // 被装饰的参数在方法参数列表中的索引（从0开始）
   ) => void;
	```
 */
export type ParamDecoratorEnhancer = ParameterDecorator;

/**
 * 创建一个参数装饰器工厂函数
 * @param factory - 自定义参数工厂函数，用于处理参数数据
 * @param enhancers - 参数装饰器增强器数组，用于添加额外的装饰器功能
 * @returns 返回一个函数，该函数接收参数数据并返回一个参数装饰器
 */
export function createParamDecorator<FactoryData = any, FactoryOutput = any>(
   factory: CustomParamFactory<FactoryData, FactoryOutput>,
   enhancers: ParamDecoratorEnhancer[] = []
): (
   ...data: FactoryData[]
) => ParameterDecorator /** 返回一个ParameterDecorator 类型的函数 */ {
   return (data?): ParameterDecorator =>
      // 参数装饰器的具体实现
      (target, key, index) => {
         // 获取目标对象上已存在的路由参数元数据
         const args =
            Reflect.getMetadata(CUSTOM_ROUTE_ARGS_METADATA, target, key) || {};

         // 定义新的路由参数元数据
         Reflect.defineMetadata(
            CUSTOM_ROUTE_ARGS_METADATA,
            assignFactoryData(args, index, factory, data),
            target,
            key
         );

         // 执行所有增强器函数
         enhancers.forEach((fn) => fn(target, key, index));
      };

   /**
    * 辅助函数：分配工厂数据到参数元数据中
    * @param args - 现有的参数元数据
    * @param paramtype - 参数类型
    * @param index - 参数索引
    * @param factory - 工厂数据
    * @returns 更新后的参数元数据对象
    */
   function assignFactoryData<TParamtype = any, TArgs = any>(
      args: TArgs,
      index: number,
      factory: CustomParamFactory<FactoryData, FactoryOutput>,
      data: any
   ) {
      return {
         ...args,
         [`${CUSTOM_ROUTE_ARGS_METADATA}:${index}`]: {
            index,
            key: CUSTOM_ROUTE_ARGS_METADATA,
            factory,
            data,
         },
      };
   }
}
