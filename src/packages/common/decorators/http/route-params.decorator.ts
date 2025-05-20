import "reflect-metadata";
import { RouteParamtypes } from "../../enums/route-paramtypes.enum";
import { ROUTE_ARGS_METADATA } from "../../constants";

export type ParamData = object | string | number;

export function createRouteParamDecorator(name: RouteParamtypes) {
   return (data?: ParamData) =>
      (
         target: Object,
         propertyKey: string | symbol,
         parameterIndex: number
      ) => {
         const existingParams =
            Reflect.getMetadata(ROUTE_ARGS_METADATA, target, propertyKey) || [];
         // 兼容处理：如果有 fn(@p() a1, a2, @p() a3)... 的函数参数并未全部使用装饰器
         // 那么，需要确保收集到的装饰器可以与参数一一对应
         existingParams[parameterIndex] = {
            parameterIndex,
            key: name,
            data,
         };

         Reflect.defineMetadata(
            ROUTE_ARGS_METADATA,
            existingParams,
            target,
            propertyKey
         );
      };
}

export const Req = createRouteParamDecorator(RouteParamtypes.REQUEST);
export const Request = Req;

export const Res = createRouteParamDecorator(RouteParamtypes.RESPONSE);
export const Response = Res;

export const Next = createRouteParamDecorator(RouteParamtypes.NEXT);

export const IP = createRouteParamDecorator(RouteParamtypes.IP);
export const Headers = createRouteParamDecorator(RouteParamtypes.HEADERS);
export const Session = createRouteParamDecorator(RouteParamtypes.SESSION);
export const Body = createRouteParamDecorator(RouteParamtypes.BODY);
export const Query = createRouteParamDecorator(RouteParamtypes.QUERY);
export const Param = createRouteParamDecorator(RouteParamtypes.PARAM);
