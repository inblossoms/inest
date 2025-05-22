import { METHOD_METADATA, PATH_METADATA } from "../../constants";
import { RequestMethod } from "../../enums/request-method.enum";

export interface RequestMappingMetadata {
   path?: string | string[];
   method?: RequestMethod;
}

const defaultMetadata = {
   [PATH_METADATA]: "/",
   [METHOD_METADATA]: RequestMethod.GET,
};

/**
 * 请求映射装饰器工厂函数
 * 用于创建处理HTTP请求的方法装饰器
 *
 * @param metadata - 请求映射元数据，包含路径和请求方法信息
 * @param metadata.path - 可选的请求路径，可以是字符串或字符串数组
 * @param metadata.method - 可选的HTTP请求方法
 * @returns MethodDecorator - 返回一个方法装饰器
 *
 * 使用示例：
 * @RequestMapping({ path: '/users', method: RequestMethod.GET })
 * findAll() { ... }
 */
export const RequestMapping = (
   metadata: RequestMappingMetadata = defaultMetadata
): MethodDecorator => {
   // 获取路径元数据，如果未提供则使用默认值"/"
   const pathMetadata = metadata[PATH_METADATA];
   const path = pathMetadata && pathMetadata.length ? pathMetadata : "/";
   // 获取请求方法，如果未提供则使用默认值GET
   const requestMethod = metadata[METHOD_METADATA] || RequestMethod.GET;

   return (
      target: object, // 装饰器所装饰的目标对象
      key: string | symbol, // 被装饰的方法名
      descriptor: TypedPropertyDescriptor<any> // 属性描述符
   ) => {
      // 使用Reflect.defineMetadata存储路径和方法信息
      Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
      Reflect.defineMetadata(METHOD_METADATA, requestMethod, descriptor.value);
      return descriptor;
   };
};

/**
 * 创建映射装饰器的工厂函数
 * 用于生成特定HTTP方法的装饰器
 *
 * @param method - HTTP请求方法枚举值
 * @returns 返回一个函数，该函数接收路径参数并返回方法装饰器
 *
 * 使用示例：
 * const Get = createMappingDecorator(RequestMethod.GET);
 * @Get('/users')
 * findAll() { ... }
 */
const createMappingDecorator =
   (method: RequestMethod) =>
   (path?: string | string[]): MethodDecorator => {
      return RequestMapping({
         [PATH_METADATA]: path,
         [METHOD_METADATA]: method,
      });
   };

/**
 * POST请求装饰器
 * 用于处理HTTP POST请求的路由装饰器
 */
export const Post = createMappingDecorator(RequestMethod.POST);

/**
 * GET请求装饰器
 * 用于处理HTTP GET请求的路由装饰器
 */
export const Get = createMappingDecorator(RequestMethod.GET);

/**
 * DELETE请求装饰器
 * 用于处理HTTP DELETE请求的路由装饰器
 */
export const Delete = createMappingDecorator(RequestMethod.DELETE);

/**
 * PUT请求装饰器
 * 用于处理HTTP PUT请求的路由装饰器
 */
export const Put = createMappingDecorator(RequestMethod.PUT);

/**
 * PATCH请求装饰器
 * 用于处理HTTP PATCH请求的路由装饰器
 */
export const Patch = createMappingDecorator(RequestMethod.PATCH);

/**
 * OPTIONS请求装饰器
 * 用于处理HTTP OPTIONS请求的路由装饰器
 */
export const Options = createMappingDecorator(RequestMethod.OPTIONS);

/**
 * HEAD请求装饰器
 * 用于处理HTTP HEAD请求的路由装饰器
 */
export const Head = createMappingDecorator(RequestMethod.HEAD);

/**
 * ALL请求装饰器
 * 用于处理所有HTTP请求的路由装饰器
 */
export const All = createMappingDecorator(RequestMethod.ALL);

/**
 * SEARCH请求装饰器
 * 用于处理HTTP SEARCH请求的路由装饰器
 */
export const Search = createMappingDecorator(RequestMethod.SEARCH);

/**
 * PROPFIND请求装饰器
 * 用于处理WebDAV PROPFIND请求的路由装饰器
 */
export const Propfind = createMappingDecorator(RequestMethod.PROPFIND);

/**
 * PROPPATCH请求装饰器
 * 用于处理WebDAV PROPPATCH请求的路由装饰器
 */
export const Proppatch = createMappingDecorator(RequestMethod.PROPPATCH);

/**
 * MKCOL请求装饰器
 * 用于处理WebDAV MKCOL请求的路由装饰器
 */
export const Mkcol = createMappingDecorator(RequestMethod.MKCOL);

/**
 * COPY请求装饰器
 * 用于处理WebDAV COPY请求的路由装饰器
 */
export const Copy = createMappingDecorator(RequestMethod.COPY);

/**
 * MOVE请求装饰器
 * 用于处理WebDAV MOVE请求的路由装饰器
 */
export const Move = createMappingDecorator(RequestMethod.MOVE);

/**
 * LOCK请求装饰器
 * 用于处理WebDAV LOCK请求的路由装饰器
 */
export const Lock = createMappingDecorator(RequestMethod.LOCK);

/**
 * UNLOCK请求装饰器
 * 用于处理WebDAV UNLOCK请求的路由装饰器
 */
export const Unlock = createMappingDecorator(RequestMethod.UNLOCK);
