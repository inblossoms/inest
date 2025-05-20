import "reflect-metadata";

function version(version: string) {
   // 当装饰器用于方法时，target 是类的原型对象（prototype）
   // 当装饰器用于静态方法时，target 是类的构造函数
   return function (target: any, propertyKey: string) {
      console.log("target:", target);
      console.log("target.constructor:", target.constructor);
      console.log("propertyKey:", propertyKey);
      console.log("target === User.prototype:", target === User.prototype);

      Reflect.defineMetadata("version", version, target, propertyKey);
   };
}

function paramType(type: any) {
   return function (target: any, propertyKey: string, parameterIndex: number) {
      Reflect.defineMetadata("paramType", type, target, propertyKey);
   };
}

function versionDescription(description: string) {
   return function (target: any, propertyKey: string) {
      Reflect.defineMetadata(
         "version:description",
         description,
         target,
         propertyKey
      );
   };
}

class User {
   @version("0.1")
   static identity(
      @paramType(String)
      value: string
   ) {
      console.log(value);
      return { obj: 1 };
   }

   @versionDescription("current version.")
   version: number = 0.1;
}

Reflect.defineMetadata("author", "roy", User);

const inst = new User();

const ver = Reflect.getMetadata("version", inst, "identity");
const paramtype = Reflect.getMetadata("paramType", inst, "identity");
const description = Reflect.getMetadata("version:description", inst, "version");
const author = Reflect.getMetadata("author", User);
