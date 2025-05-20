# TypeScript 装饰器

TypeScript 引入了新的装饰器语法，这是对 ECMAScript 装饰器提案的实现。新的装饰器语法更加简洁和强大，本文将详细介绍新装饰器的使用方法和最佳实践。

## 目录

-  [TypeScript 装饰器](#typescript装饰器)
   -  [目录](#目录)
   -  [装饰器基础](#装饰器基础)
      -  [启用装饰器](#启用装饰器)
   -  [类装饰器](#类装饰器)
   -  [方法装饰器](#方法装饰器)
   -  [属性装饰器](#属性装饰器)
   -  [参数装饰器](#参数装饰器)
   -  [装饰器工厂](#装饰器工厂)
   -  [装饰器组合](#装饰器组合)
   -  [最佳实践](#最佳实践)
   -  [实际应用示例](#实际应用示例)
      -  [1. 日志装饰器](#1-日志装饰器)
      -  [2. 缓存装饰器](#2-缓存装饰器)
      -  [3. 验证装饰器](#3-验证装饰器)
   -  [总结](#总结)

## 装饰器基础

装饰器是一种特殊类型的声明，可以被附加到类声明、方法、属性或参数上。装饰器使用 `@expression` 的形式，其中 expression 必须求值为一个函数。

### 启用装饰器

在 `tsconfig.json` 中启用装饰器：

```json
{
   "compilerOptions": {
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true
   }
}
```

## 类装饰器

类装饰器在类声明之前被声明，用于观察、修改或替换类定义。

```typescript
type ClassDecorator = <T extends new (...args: any[]) => any>(
   target: T
) => T | void;

function log<T extends new (...args: any[]) => any>(target: T): T {
   console.log("类被定义:", target.name);
   return target;
}

@log
class Example {
   // 类实现
}
```

## 方法装饰器

方法装饰器用于观察、修改或替换方法定义。

```typescript
type MethodDecorator = (
   target: any,
   propertyKey: string | symbol,
   descriptor: PropertyDescriptor
) => PropertyDescriptor | void;

function enumerable(value: boolean): MethodDecorator {
   return function (
      target: any,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor
   ): PropertyDescriptor {
      descriptor.enumerable = value;
      return descriptor;
   };
}

class Example {
   @enumerable(false)
   method() {
      // 方法实现
   }
}
```

## 属性装饰器

属性装饰器用于观察、修改或替换属性定义。

```typescript
type PropertyDecorator = (target: any, propertyKey: string | symbol) => void;

function required(target: any, propertyKey: string | symbol): void {
   let value: any;

   const getter = function (): any {
      return value;
   };

   const setter = function (newVal: any): void {
      if (newVal === undefined) {
         throw new Error(`属性 ${String(propertyKey)} 不能为 undefined`);
      }
      value = newVal;
   };

   Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
   });
}

class Example {
   @required
   name: string;
}
```

## 参数装饰器

参数装饰器用于观察、修改或替换方法参数。

```typescript
type ParameterDecorator = (
   target: any,
   propertyKey: string | symbol | undefined,
   parameterIndex: number
) => void;

function validate(
   target: any,
   propertyKey: string | symbol | undefined,
   parameterIndex: number
): void {
   const existingRequiredParameters: number[] =
      Reflect.getOwnMetadata("required", target, propertyKey) || [];
   existingRequiredParameters.push(parameterIndex);
   Reflect.defineMetadata(
      "required",
      existingRequiredParameters,
      target,
      propertyKey
   );
}

class Example {
   method(@validate name: string) {
      // 方法实现
   }
}
```

## 装饰器工厂

装饰器工厂是一个函数，它返回一个装饰器函数。

```typescript
type DecoratorFactory = (
   ...args: any[]
) => ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator;

function logWithPrefix(prefix: string): MethodDecorator {
   return function (
      target: any,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor
   ): PropertyDescriptor {
      const original = descriptor.value;

      descriptor.value = function (...args: any[]): any {
         console.log(`${prefix} 调用方法: ${String(propertyKey)}`);
         return original.apply(this, args);
      };

      return descriptor;
   };
}

class Example {
   @logWithPrefix("DEBUG")
   method() {
      // 方法实现
   }
}
```

## 装饰器组合

多个装饰器可以同时应用到一个声明上。

```typescript
function first() {
   console.log("first() 被调用");
   return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
   ) {
      console.log("first() 被应用");
      return descriptor;
   };
}

function second() {
   console.log("second() 被调用");
   return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
   ) {
      console.log("second() 被应用");
      return descriptor;
   };
}

class Example {
   @first()
   @second()
   method() {
      // 方法实现
   }
}
```

## 最佳实践

1. **保持装饰器简单**：装饰器应该只关注一个特定的功能。

2. **使用装饰器工厂**：当需要配置装饰器时，使用装饰器工厂而不是直接使用装饰器。

3. **注意执行顺序**：

   -  装饰器求值顺序：从上到下
   -  装饰器应用顺序：从下到上

4. **类型安全**：始终为装饰器参数提供正确的类型注解。

5. **避免副作用**：装饰器应该尽可能避免产生副作用。

6. **文档化**：为自定义装饰器提供清晰的文档说明。

## 实际应用示例

### 1. 日志装饰器

```typescript
function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
   const original = descriptor.value;

   descriptor.value = function (...args: any[]) {
      console.log(`调用 ${propertyKey} 参数:`, args);
      const result = original.apply(this, args);
      console.log(`${propertyKey} 返回:`, result);
      return result;
   };

   return descriptor;
}

class Calculator {
   @log
   add(a: number, b: number) {
      return a + b;
   }
}
```

### 2. 缓存装饰器

```typescript
function cache(
   target: any,
   propertyKey: string,
   descriptor: PropertyDescriptor
) {
   const original = descriptor.value;
   const cache = new Map();

   descriptor.value = function (...args: any[]) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
         return cache.get(key);
      }

      const result = original.apply(this, args);
      cache.set(key, result);
      return result;
   };

   return descriptor;
}

class MathOperations {
   @cache
   fibonacci(n: number): number {
      if (n <= 1) return n;
      return this.fibonacci(n - 1) + this.fibonacci(n - 2);
   }
}
```

### 3. 验证装饰器

```typescript
function validate(min: number, max: number) {
   return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
   ) {
      const original = descriptor.value;

      descriptor.value = function (value: number) {
         if (value < min || value > max) {
            throw new Error(`值必须在 ${min} 和 ${max} 之间`);
         }
         return original.call(this, value);
      };

      return descriptor;
   };
}

class User {
   @validate(0, 120)
   setAge(age: number) {
      this.age = age;
   }
}
```

## 总结

TypeScript 5+ 的新装饰器语法提供了更强大和灵活的方式来修改类及其成员。通过合理使用装饰器，我们可以实现代码复用、关注点分离和更好的可维护性。记住要遵循最佳实践，并确保装饰器的使用能够真正提升代码质量。
