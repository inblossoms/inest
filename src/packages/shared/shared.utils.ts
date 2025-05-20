import { MODULE_METADATA as metadataConstants } from "@inest/common/constants";

/**
 * Checks if a value is undefined
 * @param obj - The value to check
 * @returns True if the value is undefined, false otherwise
 */
export const isUndefined = (obj: any): obj is undefined =>
   typeof obj === "undefined";

/**
 * Checks if a value is an object
 * @param fn - The value to check
 * @returns True if the value is an object and not null, false otherwise
 */
export const isObject = (fn: any): fn is object =>
   !isNil(fn) && typeof fn === "object";

/**
 * Checks if a value is a plain object (created using object literal or Object constructor)
 * @param fn - The value to check
 * @returns True if the value is a plain object, false otherwise
 */
export const isPlainObject = (fn: any): fn is object => {
   if (!isObject(fn)) {
      return false;
   }
   const proto = Object.getPrototypeOf(fn);
   if (proto === null) {
      return true;
   }
   const ctor =
      Object.prototype.hasOwnProperty.call(proto, "constructor") &&
      proto.constructor;
   return (
      typeof ctor === "function" &&
      ctor instanceof ctor &&
      Function.prototype.toString.call(ctor) ===
         Function.prototype.toString.call(Object)
   );
};

/**
 * Adds a leading slash to a path if it doesn't already have one
 * @param path - The path to process
 * @returns The path with a leading slash, or empty string if path is invalid
 */
export const addLeadingSlash = (path?: string): string =>
   path && typeof path === "string"
      ? path.charAt(0) !== "/" && path.substring(0, 2) !== "{/"
         ? "/" + path
         : path
      : "";

/**
 * Normalizes a path by ensuring it starts with a slash and removing duplicate slashes
 * @param path - The path to normalize
 * @returns The normalized path, or "/" if path is empty
 */
export const normalizePath = (path?: string): string =>
   path
      ? path.startsWith("/")
         ? ("/" + path.replace(/\/+$/, "")).replace(/\/+/g, "/")
         : "/" + path.replace(/\/+$/, "")
      : "/";

/**
 * Removes the trailing slash from a path if it exists
 * @param path - The path to process
 * @returns The path without a trailing slash
 */
export const stripEndSlash = (path: string) =>
   path[path.length - 1] === "/" ? path.slice(0, path.length - 1) : path;

/**
 * Checks if a value is a function
 * @param val - The value to check
 * @returns True if the value is a function, false otherwise
 */
export const isFunction = (val: any): val is Function =>
   typeof val === "function";

/**
 * Checks if a value is a string
 * @param val - The value to check
 * @returns True if the value is a string, false otherwise
 */
export const isString = (val: any): val is string => typeof val === "string";

/**
 * Checks if a value is a number
 * @param val - The value to check
 * @returns True if the value is a number, false otherwise
 */
export const isNumber = (val: any): val is number => typeof val === "number";

/**
 * Checks if a value is the string "constructor"
 * @param val - The value to check
 * @returns True if the value is "constructor", false otherwise
 */
export const isConstructor = (val: any): boolean => val === "constructor";

/**
 * Checks if a value is null or undefined
 * @param val - The value to check
 * @returns True if the value is null or undefined, false otherwise
 */
export const isNil = (val: any): val is null | undefined =>
   isUndefined(val) || val === null;

/**
 * Checks if an array is empty
 * @param array - The array to check
 * @returns True if the array is empty or not an array, false otherwise
 */
export const isEmpty = (array: any): boolean => !(array && array.length > 0);

/**
 * Checks if a value is a symbol
 * @param val - The value to check
 * @returns True if the value is a symbol, false otherwise
 */
export const isSymbol = (val: any): val is symbol => typeof val === "symbol";

const metadataKeys = [
   metadataConstants.IMPORTS,
   metadataConstants.EXPORTS,
   metadataConstants.CONTROLLERS,
   metadataConstants.PROVIDERS,
];

/**
 * Checks if a value is a valid NestJS module
 * @param value - The value to check
 * @returns True if the value is a valid NestJS module, false otherwise
 */
export const isModule = (value: any): boolean => {
   if (!value || typeof value !== "function") {
      return false;
   }

   // Check if it's a class
   if (!(value.prototype && value.prototype.constructor === value)) {
      return false;
   }

   for (let i = 0; i < metadataKeys.length; i++) {
      const metadataKey = metadataKeys[i];

      const metadata = Reflect.getMetadata(metadataKey, value);

      if (metadata) {
         break;
      }
   }

   return true;
};
