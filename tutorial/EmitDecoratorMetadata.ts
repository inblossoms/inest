// emitDecoratorMetadata 是 TypeScript 编译器配置中的一个选项，
// 当设置为 true 时，TypeScript 编译器会在生成的 JavaScript 代码中包含一些关于装饰器所装饰的声明的类型信息元数据。
// 这个元数据可以被像 reflect-metadata 这样的库在运行时读取，从而实现依赖注入、参数类型推断等功能。

// 当 emitDecoratorMetadata 为 true 时，TypeScript 编译器会为使用了装饰器的类、方法和参数生成以下元数据：

//* 1. 类装饰器：
// 不会直接为类装饰器本身生成特定的类型元数据，但类装饰器可以利用 reflect-metadata API（如 Reflect.defineMetadata) 在类上存储自定义的元数据。

//* 2. 方法装饰器：
// 对于使用装饰器的方法，编译器会尝试生成以下元数据并附加到类的原型对象的方法上（使用 Reflect.defineMetadata）：
//> design:paramtypes: 一个包含方法参数类型的 Array。数组中的每个元素都是参数的构造函数（例如 String, Number, 自定义类等）。
//>    如果参数没有显式的类型注解，TypeScript 可能会尝试推断，但结果可能不准确或为 Object.
//> design:returntype: 方法返回值的类型构造函数。如果返回值没有显式的类型注解，结果可能是 Object 或 undefined.

//* 3. 属性装饰器：
// 对于使用装饰器的属性，编译器会尝试生成以下元数据并附加到类的原型对象的属性上：
//> design:type: 属性的类型构造函数。如果属性没有显式的类型注解，结果可能是 Object 或 undefined.

//* 4. 参数装饰器：
// 对于使用装饰器的方法参数，编译器会尝试生成以下元数据并附加到类的原型对象的方法上（通过参数索引）：
//> design:paramtypes: （与方法装饰器相同，参数的类型信息包含在方法的参数类型数组中）参数装饰器本身不生成额外的 design: 元数据，而是贡献给其所在方法的 design:paramtypes。
import "reflect-metadata";

function LogType(
   target: any,
   propertyKey: string | symbol | undefined,
   descriptorOrIndex?: PropertyDescriptor | number
) {
   if (typeof descriptorOrIndex === "number") {
      // 参数装饰器
      const paramTypes = Reflect.getMetadata(
         "design:paramtypes",
         target,
         propertyKey
      );
      console.log(
         `Parameter ${descriptorOrIndex} type of ${String(propertyKey)} on ${
            target.constructor.name
         }: ${
            paramTypes[descriptorOrIndex]
               ? paramTypes[descriptorOrIndex].name
               : "unknown"
         }`
      );
   } else if (propertyKey) {
      // 方法或属性装饰器
      const returnType = Reflect.getMetadata(
         "design:returntype",
         target,
         propertyKey
      );

      console.log("returnType:", returnType);
      console.log(
         `Return type of ${String(propertyKey)} on ${
            target.constructor.name
         }: ${returnType ? returnType.name : "unknown"}`
      );
      const propertyType = Reflect.getMetadata(
         "design:type",
         target,
         propertyKey
      );
      console.log("propertyType:", propertyType);

      console.log(
         `Property type of ${String(propertyKey)} on ${
            target.constructor.name
         }: ${propertyType ? propertyType.name : "unknown"}`
      );
   } else {
      // 类装饰器
      const paramTypes = Reflect.getMetadata("design:paramtypes", target);
      console.log(
         `Constructor parameter types of ${target.name}: ${
            paramTypes ? paramTypes.map((t) => t.name).join(", ") : "unknown"
         }`
      );
   }
}

class MyService {
   constructor(@LogType message: string) {}

   @LogType
   greet(@LogType name: string): number {
      console.log(`Hello, ${name}`);
      return 123;
   }

   @LogType
   count: boolean = true;
}

// 实例化类以触发装饰器（元数据在类定义时生成）
const service = new MyService("Initial message");
service.greet("World");
console.log("Count:", service.count);

const paramTypesGreet = Reflect.getMetadata(
   "design:paramtypes",
   MyService.prototype,
   "greet"
);
console.log(
   "Parameter types of MyService.prototype.greet:",
   paramTypesGreet ? paramTypesGreet.map((t) => t.name).join(", ") : "unknown"
);

const returnTypeGreet = Reflect.getMetadata(
   "design:returntype",
   MyService.prototype,
   "greet"
);
console.log(
   "Return type of MyService.prototype.greet:",
   returnTypeGreet ? returnTypeGreet.name : "unknown"
);

const propertyTypeCount = Reflect.getMetadata(
   "design:type",
   MyService.prototype,
   "count"
);
console.log(
   "Property type of MyService.prototype.count:",
   propertyTypeCount ? propertyTypeCount.name : "unknown"
);

const paramTypesConstructor = Reflect.getMetadata(
   "design:paramtypes",
   MyService
);
console.log(
   "Constructor parameter types of MyService:",
   paramTypesConstructor
      ? paramTypesConstructor.map((t) => t.name).join(", ")
      : "unknown"
);
