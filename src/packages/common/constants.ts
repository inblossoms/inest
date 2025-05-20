/**
 * 模块元数据键名
 */
export const MODULE_METADATA = {
   IMPORTS: "imports", // 导入的模块
   PROVIDERS: "providers", // 提供者
   CONTROLLERS: "controllers", // 控制器
   EXPORTS: "exports", // 导出的模块
};

export const MODULE_ISOLATION = "__module:isolation__";
export const MODULE_PROVIDERS = "__module:providers__";

/** 全局模块元数据键名 */
export const GLOBAL_MODULE_METADATA = "__module:global__";
/** 主机元数据键名 */
export const HOST_METADATA = "host";
/** 路径元数据键名 */
export const PATH_METADATA = "path";
/** 参数类型元数据键名 */
export const PARAMTYPES_METADATA = "design:paramtypes";
/** 自定义依赖元数据键名 */
export const SELF_DECLARED_DEPS_METADATA = "self:paramtypes";
/** 可选依赖元数据键名 */
export const OPTIONAL_DEPS_METADATA = "optional:paramtypes";
/** 属性依赖元数据键名 */
export const PROPERTY_DEPS_METADATA = "self:properties_metadata";
/** 可选属性依赖元数据键名 */
export const OPTIONAL_PROPERTY_DEPS_METADATA = "optional:properties_metadata";
/** 作用域选项元数据键名 */
export const SCOPE_OPTIONS_METADATA = "scope:options";
/** HTTP方法元数据键名 */
export const METHOD_METADATA = "method";
/** 路由参数元数据键名 */
export const ROUTE_ARGS_METADATA = "__routeArguments__";
/** 自定义路由参数元数据键名 */
export const CUSTOM_ROUTE_ARGS_METADATA = "__customRouteArgs__";
/** 异常过滤器元数据键名 */
export const FILTER_CATCH_EXCEPTIONS = "__filterCatchExceptions__";

/** 管道元数据键名 */
export const PIPES_METADATA = "__pipes__";
/** 守卫元数据键名 */
export const GUARDS_METADATA = "__guards__";
/** 拦截器元数据键名 */
export const INTERCEPTORS_METADATA = "__interceptors__";
/** 异常过滤器元数据键名 */
export const EXCEPTION_FILTERS_METADATA = "__exceptionFilters__";

/**
 * 增强器类型映射
 */
export const ENHANCER_KEY_TO_SUBTYPE_MAP = {
   [GUARDS_METADATA]: "guard", // 守卫
   [INTERCEPTORS_METADATA]: "interceptor", // 拦截器
   [PIPES_METADATA]: "pipe", // 管道
   [EXCEPTION_FILTERS_METADATA]: "filter", // 过滤器
} as const;

/** 增强器子类型 */
export type EnhancerSubtype =
   (typeof ENHANCER_KEY_TO_SUBTYPE_MAP)[keyof typeof ENHANCER_KEY_TO_SUBTYPE_MAP];

/** 渲染模板元数据键名 */
export const RENDER_METADATA = "__renderTemplate__";
/** HTTP状态码元数据键名 */
export const HTTP_CODE_METADATA = "__httpCode__";
/** 模块路径元数据键名 */
export const MODULE_PATH = "__module_path__";
/** 响应头元数据键名 */
export const HEADERS_METADATA = "__headers__";
/** 重定向元数据键名 */
export const REDIRECT_METADATA = "__redirect__";
/** 响应透传元数据键名 */
export const RESPONSE_PASSTHROUGH_METADATA = "__responsePassthrough__";
/** SSE元数据键名 */
export const SSE_METADATA = "__sse__";
/** 版本元数据键名 */
export const VERSION_METADATA = "__version__";
/** 可注入标记 */
export const INJECTABLE_WATERMARK = "__injectable__";
/** 控制器标记 */
export const CONTROLLER_WATERMARK = "__controller__";
/** 异常捕获标记 */
export const CATCH_WATERMARK = "__catch__";
/** 入口提供者标记 */
export const ENTRY_PROVIDER_WATERMARK = "__entryProvider__";
