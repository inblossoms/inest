import { isFunction } from "@/packages/shared/shared.utils";
import { EXCEPTION_FILTERS_METADATA } from "../../constants";
import { ExceptionFilter } from "../../index";
import { extendArrayMetadata } from "../../utils/extend-metadata.util";
import { validateEach } from "../../utils/validate-each.util";

/**
 * Decorator that binds exception filters to the scope of the controller or
 * method, depending on its context.
 *
 * When `@UseFilters` is used at the controller level, the filter will be
 * applied to every handler (method) in the controller.
 *
 * When `@UseFilters` is used at the individual handler level, the filter
 * will apply only to that specific method.
 *
 * @param filters exception filter instance or class, or a list of exception
 * filter instances or classes.
 *
 * @see [Exception filters](https://docs.nestjs.com/exception-filters)
 *
 * @usageNotes
 * Exception filters can also be set up globally for all controllers and routes
 * using `app.useGlobalFilters()`.  [See here for details](https://docs.nestjs.com/exception-filters#binding-filters)
 *
 * @publicApi
 */

export const UseFilters = (...filters: (ExceptionFilter | Function)[]) =>
   addExceptionFiltersMetadata(...filters);

/**
 * 添加异常过滤器元数据的装饰器工厂函数
 * 该函数可以同时作为方法装饰器和类装饰器使用
 *
 * @param filters - 异常过滤器实例或类，或者它们的数组
 * @returns 返回一个装饰器函数，该函数可以装饰类或方法
 */
function addExceptionFiltersMetadata(
   ...filters: (Function | ExceptionFilter)[]
): MethodDecorator & ClassDecorator {
   return (
      target: any, // 被装饰的目标（类或方法）
      key?: string | symbol, // 当装饰方法时的属性键名
      descriptor?: TypedPropertyDescriptor<any> // 当装饰方法时的属性描述符
   ) => {
      // 验证过滤器是否有效的辅助函数
      // 检查过滤器是否为函数或者具有catch方法的对象
      const isFilterValid = <T extends Function | Record<string, any>>(
         filter: T
      ) => filter && (isFunction(filter) || isFunction(filter.catch));

      // 如果descriptor存在，说明是方法装饰器
      if (descriptor) {
         // 验证每个过滤器是否有效
         validateEach(
            target.constructor,
            filters,
            isFilterValid,
            "@UseFilters",
            "filter"
         );
         // 将过滤器添加到方法的元数据中
         extendArrayMetadata(
            EXCEPTION_FILTERS_METADATA,
            filters,
            descriptor.value
         );
         return descriptor;
      }

      // 如果descriptor不存在，说明是类装饰器
      // 验证每个过滤器是否有效
      validateEach(target, filters, isFilterValid, "@UseFilters", "filter");
      // 将过滤器添加到类的元数据中
      extendArrayMetadata(EXCEPTION_FILTERS_METADATA, filters, target);
      return target;
   };
}
