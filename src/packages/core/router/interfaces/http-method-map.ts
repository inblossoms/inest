import { RequestMethod } from "@/packages/common/enums/request-method.enum";

/**
 * HTTP 方法映射表
 * 将 RequestMethod 枚举映射到 Express 的方法名
 */
export const HTTP_METHOD_MAP = {
   [RequestMethod.GET]: "get",
   [RequestMethod.POST]: "post",
   [RequestMethod.PUT]: "put",
   [RequestMethod.DELETE]: "delete",
   [RequestMethod.PATCH]: "patch",
   [RequestMethod.ALL]: "all",
   [RequestMethod.OPTIONS]: "options",
   [RequestMethod.HEAD]: "head",
} as const;
