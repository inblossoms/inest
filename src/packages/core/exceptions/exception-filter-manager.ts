import { ExceptionFilter } from "../../common/interfaces/exceptions/exception-filter.interface";
import { FILTER_CATCH_EXCEPTIONS } from "../../common/constants";
import { Type } from "../../common/interfaces/type.interface";
import { Logger } from "../logger-server";

export class ExceptionFilterManager {
   private readonly exceptionFilters: ExceptionFilter[] = [];
   private globalExceptionFilters = new Set<ExceptionFilter>();

   constructor(
      private readonly getProviderDependencies: (provider: Type<any>) => any[]
   ) {}

   public addExceptionFilter(filter: ExceptionFilter | Type<ExceptionFilter>) {
      if (typeof filter === "function") {
         const dependencies = this.getProviderDependencies(filter);
         const instance = new (filter as any)(...dependencies);
         this.setFilterMetadata(filter, instance);
         this.exceptionFilters.unshift(instance);
         Logger.log(
            `Instantiated filter: ${instance.constructor.name}`,
            "ExceptionFilterManager"
         );
      } else {
         this.exceptionFilters.unshift(filter);
      }
   }

   public addGlobalFilters(
      ...filters: (ExceptionFilter | Type<ExceptionFilter>)[]
   ) {
      const instantiatedFilters = filters.map((filter) => {
         if (typeof filter === "function") {
            const dependencies = this.getProviderDependencies(filter);
            const instance = new (filter as any)(...dependencies);
            this.setFilterMetadata(filter, instance);
            Logger.log(
               `Instantiated global filter: ${instance.constructor.name}`,
               "ExceptionFilterManager"
            );
            return instance;
         }
         return filter;
      });

      this.globalExceptionFilters = new Set([
         ...this.globalExceptionFilters,
         ...instantiatedFilters,
      ]);
   }

   public async handleException(
      err: any,
      context: any,
      externalFilter: ExceptionFilter
   ) {
      Logger.log(
         `Handling exception: ${err.constructor.name}`,
         "ExceptionFilterManager"
      );

      // 首先尝试使用注册的异常过滤器
      for (const filter of this.exceptionFilters) {
         const filterMetadata = this.getFilterMetadata(filter);
         Logger.log(
            `Checking filter: ${filter.constructor.name}`,
            "ExceptionFilterManager"
         );

         if (this.shouldHandleException(filterMetadata, err)) {
            Logger.log(
               `Filter ${filter.constructor.name} will handle the exception`,
               "ExceptionFilterManager"
            );
            try {
               return await filter.catch(err, context);
            } catch (filterError) {
               Logger.error(
                  `Error in filter ${filter.constructor.name}:`,
                  filterError,
                  "ExceptionFilterManager"
               );
            }
         }
      }

      // 然后尝试使用全局异常过滤器
      for (const filter of this.globalExceptionFilters) {
         const filterMetadata = this.getFilterMetadata(filter);
         Logger.log(
            `Checking global filter: ${filter.constructor.name}`,
            "ExceptionFilterManager"
         );

         if (this.shouldHandleException(filterMetadata, err)) {
            Logger.log(
               `Global filter ${filter.constructor.name} will handle the exception`,
               "ExceptionFilterManager"
            );
            try {
               return await filter.catch(err, context);
            } catch (filterError) {
               Logger.error(
                  `Error in global filter ${filter.constructor.name}:`,
                  filterError,
                  "ExceptionFilterManager"
               );
            }
         }
      }

      // 最后使用外部异常过滤器
      Logger.log(
         `No specific filter found, using external filter`,
         "ExceptionFilterManager"
      );
      return externalFilter.catch(err, context);
   }

   private setFilterMetadata(originalFilter: any, instance: any) {
      const exceptions =
         Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, originalFilter) || [];
      Logger.log(
         `Setting metadata for ${
            instance.constructor.name
         }, exceptions: ${exceptions
            .map((e) => e?.name || "unknown")
            .join(", ")}`,
         "ExceptionFilterManager"
      );

      // 确保所有异常类型都是有效的构造函数
      const validExceptions = exceptions.filter(
         (exception) => typeof exception === "function"
      );

      Reflect.defineMetadata(
         FILTER_CATCH_EXCEPTIONS,
         validExceptions,
         instance.constructor
      );
   }

   private getFilterMetadata(filter: ExceptionFilter) {
      const filterConstructor = filter.constructor;
      const exceptions =
         Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, filterConstructor) ?? [];
      Logger.log(
         `Getting metadata for ${
            filterConstructor.name
         }, exceptions: ${exceptions
            .map((e) => e?.name || "unknown")
            .join(", ")}`,
         "ExceptionFilterManager"
      );
      return {
         exceptions,
      };
   }

   private shouldHandleException(filterMetadata: any, err: any) {
      const exceptions = filterMetadata.exceptions || [];
      if (exceptions.length === 0) {
         return true;
      }

      Logger.log(
         `Checking if ${
            err.constructor.name
         } should be handled by filter with exceptions: ${exceptions
            .map((e) => e?.name || "unknown")
            .join(", ")}`,
         "ExceptionFilterManager"
      );

      return exceptions.some((exception) => {
         if (typeof exception !== "function") {
            Logger.warn(
               `Invalid exception type: ${exception}`,
               "ExceptionFilterManager"
            );
            return false;
         }
         try {
            const result =
               err instanceof exception ||
               err.constructor.name === exception.name;
            Logger.log(
               `Checking if ${err.constructor.name} instanceof ${exception.name}: ${result}`,
               "ExceptionFilterManager"
            );
            return result;
         } catch (e) {
            Logger.error(
               `Error checking exception type: ${e.message}`,
               "ExceptionFilterManager"
            );
            return false;
         }
      });
   }
}
