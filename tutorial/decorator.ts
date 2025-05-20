import "reflect-metadata";

const REQUIRED_PARAMETERS = "REQUIRED_PARAMETERS";

function validate(target: any, propertyKey?: string, parameterIndex?: number) {
   if (arguments.length === 1) {
      for (const key in target) {
         if (Reflect.hasMetadata("required", target, key)) {
            if (Reflect.getMetadata("required", target, key) && !target[key]) {
               throw new Error(`Property ${key} is required`);
            }
         }
      }
   } else {
      // 参数装饰器 用于对类的构造函数或者方法的参数进行验证
      const existingValidators: number[] =
         Reflect.getOwnMetadata("validate", target, propertyKey) || [];
      existingValidators.push(parameterIndex);
      Reflect.defineMetadata(
         REQUIRED_PARAMETERS,
         existingValidators,
         target,
         propertyKey
      );
   }
}

function logger(t: any, propertyKey: string, descriptor: PropertyDescriptor) {
   console.log(t, propertyKey, descriptor);
   const originalMethod = descriptor.value;

   descriptor.value = function () {
      console.log(arguments);
      console.log("before");

      const result = originalMethod.apply(this, arguments);

      console.log("result", result);
      console.log("after");

      return result;
   };
   return descriptor;
}

function validatePrameters(
   target: any,
   propertyKey: string,
   descriptor: PropertyDescriptor
) {
   const originalMethod = descriptor.value;
   descriptor.value = function () {
      const requiredParameters: number[] =
         Reflect.getOwnMetadata(REQUIRED_PARAMETERS, target, propertyKey) || [];
      const args = Array.from(arguments);
      requiredParameters.forEach((index) => {
         if (args[index] === undefined) {
            throw new Error(`Parameter ${index} is required`);
         }
      });
      return originalMethod.apply(this, arguments);
   };
   return descriptor;
}

/**
 *
 * @param target 所装饰的目标对象如果是静态属性则为类的构造函数，如果是实例属性则为类的原型对象
 * @param propertyKey 被装饰的属性名
 */
function required(target: any, propertyKey: string) {
   console.log("required >>>", target, propertyKey);
   console.log(target === Calulator.prototype);
   Reflect.defineMetadata("required", true, target, propertyKey);
}
// 属性访问器 通过属性装饰器进行访问控制或者设置初始值
function defaultValue(value: unknown) {
   return function (target: any, propertyKey: string) {
      let _val = value;
      const getter = () => _val;
      const setter = (val: unknown) => (_val = val);

      Object.defineProperty(target, propertyKey, {
         get: getter,
         set: setter,
         enumerable: true,
         configurable: true,
      });
   };
}

class Calulator {
   constructor(private a: number, private b: number) {}

   @defaultValue("This is a default value")
   @required
   info: string;

   @logger
   @validatePrameters
   add(@validate a: number, @validate b: number): number {
      this.a = a;
      this.b = b;
      return a + b;
   }
}

const c = new Calulator(1, 2);
validate(c);
console.log(c.info);

// console.log(c.add(undefined, undefined)); // 3
// ---------------------------------------
const users = {
   "001": { roles: ["admin"] },
   "002": { roles: ["member"] },
};

function authorize(
   target: any,
   propertyKey: string,
   descriptor: PropertyDescriptor
) {
   const fn = descriptor.value;
   descriptor.value = function (...args: any[]) {
      const user = users[args[0]];

      if (user && user.roles.includes("admin")) {
         fn.apply(this, args);
      } else {
         throw new Error("User is not authorized to call this method.");
      }
   };
   return descriptor;
}

function logged(value, context) {
   //    console.log(value, context);

   const { kind, name } = context;
   if (kind === "accessor") {
      let { get, set } = value;

      return {
         get() {
            console.log(`getting ${name}`);
            return get.call(this);
         },

         set(val) {
            console.log(`setting ${name} to ${val}`);
            return set.call(this, val);
         },

         init(initialValue) {
            console.log(`initializing ${name} with value ${initialValue}`);
            return initialValue;
         },
      };
   }
}

class User {
   private _u = "roy"; // 私有变量

   @logged
   get user() {
      return this._u;
   }

   set user(u) {
      this._u = u;
   }

   @authorize
   deleteUser(u: string) {
      console.log(`User ${u} is deleted.`);
   }
}

let cc = new User();

console.log(cc.user); // getting roy
cc.deleteUser("001");
cc.user = "clin"; // setting x to clin
console.log(cc.user); // getting clin

// ----------------------------------------
// 装饰器的执行顺序：类装饰器一定最后执行，实例属性、方法装饰器, 静态属性、方法装饰器按照声明顺序执行，参数装饰器在方法执行前执行。
function a(target) {
   console.log("a");
}

function b(target, propertyKey) {
   console.log("b:", propertyKey);
}

function e(target, propertyKey) {
   console.log("e:", propertyKey);
}

function d(target, propertyKey, descriptor) {
   console.log("d:", propertyKey, descriptor);
}

function p(target, propertyKey, parameterIndex) {
   console.log("p:", propertyKey, parameterIndex);
}

@a
class T {
   @b
   static staticField = "staticField";

   @e
   get call() {
      return "call";
   }
   @d
   static fn() {}
   @d
   say(@p s: string) {}
   @b
   instanceField: string;
}
