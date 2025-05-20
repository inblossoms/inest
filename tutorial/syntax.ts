import "reflect-metadata";

//* 装饰器不能用于函数声明
//* 装饰器表达式会在类定义时执行，而不是在运行时

//! 1. 类的装饰器 (Class Decorator)
// 目标 (Target): 类的构造函数 (Function)。
// 回调函数类型参数:
//    target: Function: 被装饰的类的构造函数。
// 返回值: 可以返回一个新的构造函数来替换原始的类的构造函数。如果返回 void，则使用原始的构造函数。

// 示例:
function sealed(constructor: Function) {
   console.log(constructor === Greeter);
   Object.seal(constructor);
   Object.seal(constructor.prototype);
}

@sealed
class Greeter {
   greeting: string;
   constructor(message: string) {
      this.greeting = message;
   }
   greet() {
      return "Hello, " + this.greeting;
   }
}

// 声明接口来扩展 Greeter 的类型
interface Greeter {
   newMethod: () => void;
   newStaticProp: string;
}

// 使用 namespace 来扩展静态属性
namespace Greeter {
   export let newStaticProp: string;
}

const gr = new Greeter("seal?");
console.log(gr.greet());
console.log(gr.greeting);

// 测试 Object.seal 的效果
try {
   // 1. 尝试添加新的静态属性
   Greeter.newStaticProp = "test"; // 会失败
} catch (e) {
   console.log("Cannot add new static property:", e.message);
}

try {
   // 2. 尝试添加新的原型方法
   Greeter.prototype.newMethod = function () {}; // 会失败
} catch (e) {
   console.log("Cannot add new prototype method:", e.message);
}

try {
   // 3. 尝试修改现有属性的配置
   Object.defineProperty(Greeter.prototype, "greet", {
      configurable: true,
   }); // 会失败
} catch (e) {
   console.log("Cannot modify property configuration:", e.message);
}

// 4. 但可以修改现有属性的值
gr.greeting = "new value"; // 这是允许的
console.log(gr.greet()); // 输出: "Hello, new value"

//! 2. 属性的装饰器 (Property Decorator)
// 目标 (Target): 类的原型对象 (Object)，如果是静态属性则是类的构造函数 (Function)。
// 回调函数类型参数:
//    target: Object | Function: 对于实例属性是类的原型对象，对于静态属性是类的构造函数。
//    propertyKey: string | symbol: 被装饰的属性的名称。
// 返回值: 可以返回一个属性描述符 (PropertyDescriptor) 来修改属性的行为。如果返回 void，则使用 JavaScript 默认的属性定义行为。

// 示例 (实例属性):
function logProperty(target: any, propertyKey: string) {
   console.log(
      `Declaring property ${propertyKey} on ${target.constructor.name}.prototype`
   );
}

class Example {
   @logProperty
   name: string;
}

// 示例 (静态属性):
function staticLogProperty(target: Function, propertyKey: string) {
   console.log(`Declaring static property ${propertyKey} on ${target.name}`);
}

class ExampleStatic {
   @staticLogProperty
   static count: number = 0;
}

//! 3. 方法的装饰器 (Method Decorator)
// 目标 (Target): 类的原型对象 (Object)，如果是静态方法则是类的构造函数 (Function)。
// 回调函数类型参数:
//    target: Object | Function: 对于实例方法是类的原型对象，对于静态方法是类的构造函数。
//    propertyKey: string | symbol: 被装饰的方法的名称。
//    descriptor: PropertyDescriptor: 被装饰的方法的属性描述符。你可以访问和修改方法的 value（函数本身）、writable、enumerable、configurable 等属性。
// 返回值: 可以返回一个新的属性描述符来完全替换原始方法的属性描述符。如果返回 void，则使用原始的属性描述符。

// 示例 (实例方法):
function logMethod(
   target: any,
   propertyKey: string,
   descriptor: PropertyDescriptor
) {
   const originalMethod = descriptor.value;
   descriptor.value = function (...args: any[]) {
      console.log(
         `Calling method ${propertyKey} with arguments: ${JSON.stringify(args)}`
      );
      const result = originalMethod.apply(this, args);
      console.log(`Method ${propertyKey} returned: ${result}`);
      return result;
   };
   return descriptor;
}

class Calculator {
   @logMethod
   add(a: number, b: number) {
      return a + b;
   }
}

// 示例 (静态方法):
function staticLogMethod(
   target: Function,
   propertyKey: string,
   descriptor: PropertyDescriptor
) {
   const originalMethod = descriptor.value;
   descriptor.value = function (...args: any[]) {
      console.log(
         `Calling static method ${propertyKey} with arguments: ${JSON.stringify(
            args
         )}`
      );
      const result = originalMethod.apply(this, args);
      console.log(`Static method ${propertyKey} returned: ${result}`);
      return result;
   };
   return descriptor;
}

class StaticCalculator {
   @staticLogMethod
   static multiply(a: number, b: number) {
      return a * b;
   }
}

//! 4. 参数的装饰器 (Parameter Decorator)
// 目标 (Target): 类的原型对象 (Object)，如果是静态方法的参数则是类的构造函数 (Function)。
// 回调函数类型参数:
//    target: Object | Function: 对于实例方法是类的原型对象，对于静态方法是类的构造函数。
//    propertyKey: string | symbol: 被装饰的参数所在的方法的名称。
//    parameterIndex: number: 被装饰的参数在方法参数列表中的索引（从 0 开始）。
// 返回值: 参数装饰器通常不返回值。它们的目的是在目标对象上记录关于参数的元数据，通常与 reflect-metadata 库一起使用。

import "reflect-metadata";
// 示例 (实例方法参数):
function paramInfo(
   target: any,
   propertyKey: string | symbol,
   parameterIndex: number
) {
   // 注意：这里我们只存储参数类型信息，不存储参数索引
   Reflect.defineMetadata("paramType", String, target, propertyKey);
}

class GreeterParam {
   greet(@paramInfo message: string) {
      return "Hello, " + message;
   }
}

// 获取方法参数的元数据
const paramType = Reflect.getMetadata(
   "paramType",
   GreeterParam.prototype,
   "greet"
);
console.log(paramType); // 输出: [Function: String]
console.log(paramType === String); // 输出: true
console.log(new paramType("test")); // 输出: [String: 'test']

// 示例 (静态方法参数):
function staticParamInfo(
   target: Function,
   propertyKey: string | symbol,
   parameterIndex: number
) {
   // 注意：这里我们只存储参数类型信息，不存储参数索引
   Reflect.defineMetadata("staticParamType", Number, target, propertyKey);
}

class StaticAdder {
   static add(@staticParamInfo a: number, b: number) {
      return a + b;
   }
}

// 获取静态方法参数的元数据
const staticParamType = Reflect.getMetadata(
   "staticParamType",
   StaticAdder,
   "add"
);
console.log(staticParamType); // 输出: Number

//! 5. 访问器装饰器 (Accessor Decorator)
// 访问器装饰器只能应用于 getter 或 setter 之一
// 目标 (Target): 类的原型对象 (Object)，如果是静态访问器则是类的构造函数 (Function)。
// 回调函数类型参数:
//    target: Object | Function: 对于实例访问器是类的原型对象，对于静态访问器是类的构造函数。
//    propertyKey: string | symbol: 被装饰的访问器的名称。
//    descriptor: PropertyDescriptor: 被装饰的访问器的属性描述符。
// 返回值: 可以返回一个新的属性描述符来完全替换原始访问器的属性描述符。如果返回 void，则使用原始的属性描述符。

// 示例 (实例访问器):
function logAccessor(
   target: any,
   propertyKey: string,
   descriptor: PropertyDescriptor
) {
   const originalGet = descriptor.get;
   const originalSet = descriptor.set;

   if (originalGet) {
      descriptor.get = function () {
         console.log(`Getting ${propertyKey}`);
         return originalGet.call(this);
      };
   }

   if (originalSet) {
      descriptor.set = function (value: any) {
         console.log(`Setting ${propertyKey} to ${value}`);
         return originalSet.call(this, value);
      };
   }

   return descriptor;
}

class User {
   private _name: string = "";

   @logAccessor
   get name(): string {
      return this._name;
   }

   set name(value: string) {
      this._name = value;
   }
}

// 示例 (静态访问器):
function staticLogAccessor(
   target: Function,
   propertyKey: string,
   descriptor: PropertyDescriptor
) {
   const originalGet = descriptor.get;
   const originalSet = descriptor.set;

   if (originalGet) {
      descriptor.get = function () {
         console.log(`Getting static ${propertyKey}`);
         return originalGet.call(this);
      };
   }

   if (originalSet) {
      descriptor.set = function (value: any) {
         console.log(`Setting static ${propertyKey} to ${value}`);
         return originalSet.call(this, value);
      };
   }

   return descriptor;
}

class StaticUser {
   private static _count: number = 0;

   @staticLogAccessor
   static get count(): number {
      return StaticUser._count;
   }

   static set count(value: number) {
      StaticUser._count = value;
   }
}

// 测试访问器装饰器
const user = new User();
user.name = "John"; // 输出: Setting name to John
console.log(user.name); // 输出: Getting name, John

StaticUser.count = 1; // 输出: Setting static count to 1
console.log(StaticUser.count); // 输出: Getting static count, 1

//! 6. 装饰器组合与执行顺序 (ESNext)
// 装饰器工厂
function log(target: any, key: string) {
   console.log(`Decorated ${key}`);
}

function validate(target: any, key: string) {
   console.log(`Validating ${key}`);
}

// 装饰器组合
function compose(...decorators: Function[]) {
   return function (target: any, key: string) {
      decorators.forEach((decorator) => decorator(target, key));
   };
}

// 参数装饰器
function paramLog(target: any, key: string, index: number) {
   console.log(`Parameter ${index} of ${key} decorated`);
}

// 方法装饰器
function methodLog(target: any, key: string, descriptor: PropertyDescriptor) {
   console.log(`Method ${key} decorated`);
   return descriptor;
}

// 属性装饰器
function propertyLog(target: any, key: string) {
   console.log(`Property ${key} decorated`);
}

// 访问器装饰器
function accessorLog(target: any, key: string, descriptor: PropertyDescriptor) {
   console.log(`Accessor ${key} decorated`);
   return descriptor;
}

// 类装饰器
function classLog(target: Function) {
   console.log(`Class ${target.name} decorated`);
}

@classLog
class DecoratorExample {
   @propertyLog
   @compose(log, validate)
   name: string;

   constructor(@paramLog name: string) {
      this.name = name;
   }

   @methodLog
   @compose(log, validate)
   method(@paramLog param1: string, @paramLog param2: number) {
      console.log(param1, param2);
   }

   @accessorLog
   get value(): string {
      return this.name;
   }

   set value(v: string) {
      this.name = v;
   }
}

// 执行顺序示例
const example = new DecoratorExample("test");
example.method("param1", 42);
