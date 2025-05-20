import "reflect-metadata";
import { HttpStatus, RequestMethod } from "../../enums";
import {
   HEADERS_METADATA,
   HTTP_CODE_METADATA,
   METHOD_METADATA,
   PATH_METADATA,
   REDIRECT_METADATA,
} from "../../constants";

export function Get(path: string = ""): MethodDecorator {
   return function <T>(
      target: Object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<T>
   ) {
      Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
      Reflect.defineMetadata(
         METHOD_METADATA,
         RequestMethod.GET,
         descriptor.value
      );
   };
}

export function Post(path: string = ""): MethodDecorator {
   return function <T>(
      target: Object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<T>
   ) {
      Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
      Reflect.defineMetadata(
         METHOD_METADATA,
         RequestMethod.POST,
         descriptor.value
      );
   };
}

export function Redirect(
   url: string = "/",
   statusCode: HttpStatus = HttpStatus.FOUND
): MethodDecorator {
   return function <T>(
      target: Object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<T>
   ) {
      Reflect.defineMetadata(REDIRECT_METADATA, url, descriptor.value);
      Reflect.defineMetadata(HTTP_CODE_METADATA, statusCode, descriptor.value);
   };
}

export function HttpCode(
   statusCode: HttpStatus = HttpStatus.OK
): MethodDecorator {
   return function <T>(
      target: Object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<T>
   ) {
      Reflect.defineMetadata(HTTP_CODE_METADATA, statusCode, descriptor.value);
   };
}

export function Header(key: string, value: string): MethodDecorator {
   return function <T>(
      target: Object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<T>
   ) {
      let HeadersMap =
         Reflect.getMetadata(HEADERS_METADATA, descriptor.value) ?? {};
      HeadersMap = Object.assign(HeadersMap, { [key]: value });
      Reflect.defineMetadata(HEADERS_METADATA, HeadersMap, descriptor.value);
   };
}
