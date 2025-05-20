# TypeScript Stage 3 装饰器

TypeScript 5.0 实现了 ECMAScript 装饰器提案的 Stage 3 版本，这个新版本的装饰器语法与之前的实验性装饰器有很大的不同。本文将详细介绍新的装饰器语法和使用方法。

## 目录

-  [TypeScript Stage 3 装饰器](#typescript-stage-3-装饰器)
   -  [目录](#目录)
   -  [新装饰器语法概述](#新装饰器语法概述)
      -  [配置](#配置)
   -  [类装饰器](#类装饰器)
   -  [类字段装饰器](#类字段装饰器)
   -  [类方法装饰器](#类方法装饰器)
   -  [类访问器装饰器](#类访问器装饰器)
   -  [装饰器上下文](#装饰器上下文)
      -  [addInitializer 方法](#addinitializer-方法)
   -  [实际应用示例](#实际应用示例)
      -  [1. 自动绑定方法](#1-自动绑定方法)
      -  [2. 缓存装饰器](#2-缓存装饰器)
      -  [3. 依赖注入装饰器](#3-依赖注入装饰器)
      -  [4. 验证装饰器](#4-验证装饰器)
   -  [参数装饰器](#参数装饰器)
      -  [参数装饰器工厂](#参数装饰器工厂)
      -  [参数验证装饰器](#参数验证装饰器)
      -  [参数转换装饰器](#参数转换装饰器)
      -  [参数依赖注入装饰器](#参数依赖注入装饰器)
      -  [参数装饰器的最佳实践](#参数装饰器的最佳实践)
   -  [总结](#总结)

## 新装饰器语法概述

新的装饰器语法更加简洁和直观，主要变化包括：

1. 装饰器现在是一个函数，接收一个上下文对象作为参数
2. 装饰器可以返回新的值来替换被装饰的目标
3. 装饰器可以访问更多的元数据
4. 装饰器的执行顺序更加可预测

### 配置

在 `tsconfig.json` 中启用新装饰器：

```json
{
   "compilerOptions": {
      "target": "ES2022",
      "experimentalDecorators": false,
      "useDefineForClassFields": true
   }
}
```

## 类装饰器

```typescript
type ClassDecorator = <T extends new (...args: any[]) => any>(
   target: T, // 被装饰的类的构造函数
   context: ClassDecoratorContext // 装饰器上下文对象，包含类的元数据
) => T | void;

// 装饰器上下文对象 (ClassDecoratorContext) 包含以下属性：
// - kind: "class" - 表示这是一个类装饰器
// - name: string | symbol - 类的名称
// - addInitializer: (initializer: () => void) => void - 用于添加初始化器函数
// - metadata: Record<string | symbol | number, any> - 类的元数据

function log<T extends new (...args: any[]) => any>(
   target: T,
   context: ClassDecoratorContext
): T {
   return class extends target {
      constructor(...args: any[]) {
         console.log("类被实例化:", target.name);
         super(...args);
      }
   };
}

@log
class Example {
   constructor() {
      console.log("Example 构造函数");
   }
}
```

## 类字段装饰器

```typescript
type ClassFieldDecorator = (
   target: any, // 类的原型对象（实例字段）或类本身（静态字段）
   context: ClassFieldDecoratorContext // 装饰器上下文对象，包含字段的元数据
) => (value: any) => any; // 返回一个函数，用于处理字段的初始值

// 装饰器上下文对象 (ClassFieldDecoratorContext) 包含以下属性：
// - kind: "field" - 表示这是一个字段装饰器
// - name: string | symbol - 字段的名称
// - static: boolean - 是否为静态字段
// - private: boolean - 是否为私有字段
// - addInitializer: (initializer: () => void) => void - 用于添加初始化器函数
// - metadata: Record<string | symbol | number, any> - 字段的元数据

function required(
   target: any,
   context: ClassFieldDecoratorContext
): (value: any) => any {
   return function (value: any): any {
      if (value === undefined) {
         throw new Error(`字段 ${String(context.name)} 不能为 undefined`);
      }
      return value;
   };
}

class Example {
   @required
   name: string;
}
```

## 类方法装饰器

```typescript
type ClassMethodDecorator = (
   target: any, // 被装饰的方法
   context: ClassMethodDecoratorContext // 装饰器上下文对象，包含方法的元数据
) => (this: any, ...args: any[]) => any; // 返回一个新的方法实现

// 装饰器上下文对象 (ClassMethodDecoratorContext) 包含以下属性：
// - kind: "method" - 表示这是一个方法装饰器
// - name: string | symbol - 方法的名称
// - static: boolean - 是否为静态方法
// - private: boolean - 是否为私有方法
// - addInitializer: (initializer: () => void) => void - 用于添加初始化器函数
// - metadata: Record<string | symbol | number, any> - 方法的元数据

function log(
   target: any,
   context: ClassMethodDecoratorContext
): (this: any, ...args: any[]) => any {
   const methodName = context.name;

   return function (this: any, ...args: any[]): any {
      console.log(`调用方法 ${String(methodName)} 参数:`, args);
      const result = target.call(this, ...args);
      console.log(`方法 ${String(methodName)} 返回:`, result);
      return result;
   };
}

class Example {
   @log
   add(a: number, b: number): number {
      return a + b;
   }
}
```

## 类访问器装饰器

```typescript
type ClassAccessorDecorator = (
   target: any, // 被装饰的访问器
   context: ClassAccessorDecoratorContext // 装饰器上下文对象，包含访问器的元数据
) => {
   get: () => any; // getter 函数
   set: (value: any) => void; // setter 函数
};

// 装饰器上下文对象 (ClassAccessorDecoratorContext) 包含以下属性：
// - kind: "accessor" - 表示这是一个访问器装饰器
// - name: string | symbol - 访问器的名称
// - static: boolean - 是否为静态访问器
// - private: boolean - 是否为私有访问器
// - addInitializer: (initializer: () => void) => void - 用于添加初始化器函数
// - metadata: Record<string | symbol | number, any> - 访问器的元数据

function validate(min: number, max: number): ClassAccessorDecorator {
   return function (
      target: any,
      context: ClassAccessorDecoratorContext
   ): {
      get: () => any;
      set: (value: any) => void;
   } {
      return {
         get() {
            return target.get.call(this);
         },
         set(value: number) {
            if (value < min || value > max) {
               throw new Error(`值必须在 ${min} 和 ${max} 之间`);
            }
            target.set.call(this, value);
         },
      };
   };
}

class Example {
   @validate(0, 120)
   accessor age: number = 0;
}
```

## 装饰器上下文

新的装饰器上下文对象提供了丰富的元数据：

```typescript
function debug(
   target: any,
   context:
      | ClassDecoratorContext
      | ClassMethodDecoratorContext
      | ClassFieldDecoratorContext
      | ClassAccessorDecoratorContext
) {
   console.log("装饰器类型:", context.kind);
   console.log("装饰器名称:", context.name);
   console.log("是否为静态成员:", context.static);
   console.log("是否为私有成员:", context.private);
   console.log("元数据:", context.metadata);

   return target;
}

class Example {
   @debug
   static field: string;

   @debug
   method() {}
}
```

### addInitializer 方法

`addInitializer` 是装饰器上下文中的一个重要方法，它允许我们在类实例化时执行一些初始化逻辑。这个方法在以下场景特别有用：

1. 在类实例化时自动执行某些操作
2. 在类实例化时注册事件监听器
3. 在类实例化时进行依赖注入
4. 在类实例化时进行属性验证

```typescript
function autoBind(target: any, context: ClassMethodDecoratorContext) {
   // 保存原始方法
   const original = target;

   // 添加初始化器
   context.addInitializer(function () {
      // this 指向类实例
      const methodName = context.name;
      this[methodName] = this[methodName].bind(this);
   });

   return target;
}

class Example {
   @autoBind
   handleClick() {
      console.log("this:", this);
   }
}

const example = new Example();
const handler = example.handleClick;
handler(); // 正确绑定 this
```

另一个例子，使用 `addInitializer` 进行属性验证：

```typescript
function validate(min: number, max: number) {
   return function (target: any, context: ClassFieldDecoratorContext) {
      // 添加初始化器
      context.addInitializer(function () {
         const value = this[context.name];
         if (value < min || value > max) {
            throw new Error(
               `属性 ${String(context.name)} 的值必须在 ${min} 和 ${max} 之间`
            );
         }
      });

      return target;
   };
}

class User {
   @validate(0, 120)
   age: number = 0;
}
```

使用 `addInitializer` 进行依赖注入：

```typescript
function inject(service: any) {
   return function (target: any, context: ClassFieldDecoratorContext) {
      context.addInitializer(function () {
         // 在实例化时注入服务
         this[context.name] = new service();
      });

      return target;
   };
}

class DatabaseService {
   query() {
      return "查询结果";
   }
}

class UserService {
   @inject(DatabaseService)
   private db: DatabaseService;

   getUsers() {
      return this.db.query();
   }
}
```

使用 `addInitializer` 注册事件监听器：

```typescript
function eventListener(eventName: string) {
   return function (target: any, context: ClassMethodDecoratorContext) {
      context.addInitializer(function () {
         // 在实例化时注册事件监听器
         document.addEventListener(eventName, this[context.name].bind(this));
      });

      return target;
   };
}

class Button {
   @eventListener("click")
   handleClick() {
      console.log("按钮被点击");
   }
}
```

`addInitializer` 的主要特点：

1. 在类实例化时自动执行
2. 可以访问类实例（通过 `this`）
3. 可以访问装饰器的上下文信息
4. 可以执行异步操作
5. 可以添加多个初始化器

注意事项：

-  `addInitializer` 只在类实例化时执行一次
-  初始化器的执行顺序与装饰器的应用顺序相同
-  如果装饰器返回新的值，初始化器仍然会执行
-  初始化器中的 `this` 指向类实例

## 实际应用示例

### 1. 自动绑定方法

```typescript
function bound(target: any, context: ClassMethodDecoratorContext) {
   const methodName = context.name;

   return function (this: any, ...args: any[]) {
      return target.call(this, ...args);
   };
}

class Example {
   @bound
   handleClick() {
      console.log("this:", this);
   }
}
```

### 2. 缓存装饰器

```typescript
function cache(target: any, context: ClassMethodDecoratorContext) {
   const cache = new WeakMap();

   return function (this: any, ...args: any[]) {
      const key = JSON.stringify(args);
      if (cache.has(this)) {
         const methodCache = cache.get(this);
         if (methodCache.has(key)) {
            return methodCache.get(key);
         }
      }

      const result = target.call(this, ...args);
      if (!cache.has(this)) {
         cache.set(this, new Map());
      }
      cache.get(this).set(key, result);
      return result;
   };
}

class MathOperations {
   @cache
   fibonacci(n: number): number {
      if (n <= 1) return n;
      return this.fibonacci(n - 1) + this.fibonacci(n - 2);
   }
}
```

### 3. 依赖注入装饰器

```typescript
function inject(service: any) {
   return function (target: any, context: ClassFieldDecoratorContext) {
      return function (value: any) {
         return service;
      };
   };
}

class DatabaseService {
   query() {
      return "查询结果";
   }
}

class UserService {
   @inject(DatabaseService)
   private db: DatabaseService;

   getUsers() {
      return this.db.query();
   }
}
```

### 4. 验证装饰器

```typescript
function validate(schema: any) {
   return function (target: any, context: ClassFieldDecoratorContext) {
      return function (value: any) {
         if (!schema.validate(value)) {
            throw new Error(`验证失败: ${context.name}`);
         }
         return value;
      };
   };
}

class User {
   @validate({ type: "string", minLength: 3 })
   name: string;

   @validate({ type: "number", minimum: 0, maximum: 120 })
   age: number;
}
```

## 参数装饰器

在 Stage 3 中，参数装饰器的语法和功能有了显著变化。新的参数装饰器可以访问更多的上下文信息，并且可以修改参数的行为。

```typescript
// 装饰器的执行时机和流程
// 当 Example 类被定义时，装饰器 @validate (0,120) 会应用到 setAge 方法的 age 参数上。此时，validate 函数首先执
// 行，生成一个装饰器函数，这个装饰器函数被用来包装 setAge 方法。
// 当调用 setAge 方法时，实际上是调用了装饰器返回的函数。这个函数首先获取传入的参数值 value，即 args[0]，这里 args 是方
// 法调用时传入的参数数组。
// 然后对 value 进行范围检查，如果 value 小于 min（0）或者大于 max（120），就抛出一个错误，提示参数值必须在 0 和 120
// 之间。
// 如果参数值合法，就调用原始的 setAge 方法（通过 target.call(this, ...args)），在这里 target 是原始的 setAge 方
// 法，this 指向调用 setAge 方法的对象实例。
type ParameterDecorator = (
   target: any, // 被装饰的方法
   context: ClassMethodDecoratorContext // 装饰器上下文对象，包含参数的元数据
) => (this: any, ...args: any[]) => any; // 返回一个新的方法实现

// 装饰器上下文对象 (ClassMethodDecoratorContext) 包含以下属性：
// - kind: "method" - 表示这是一个方法装饰器
// - name: string | symbol - 方法的名称
// - static: boolean - 是否为静态方法
// - private: boolean - 是否为私有方法
// - addInitializer: (initializer: () => void) => void - 用于添加初始化器函数
// - metadata: Record<string | symbol | number, any> - 方法的元数据，包含参数信息
//   - paramNames: string[] - 方法参数的名称数组
//   - paramTypes: any[] - 方法参数的类型数组
//   - returnType: any - 方法的返回类型

// 参数装饰器的执行流程：
// 1. 当类被定义时，参数装饰器会被调用
// 2. target 参数是被装饰的方法
// 3. context 参数包含方法的元数据，可以通过它访问参数信息
// 4. 装饰器返回一个新的方法实现，用于替换原始方法
// 5. 新方法实现可以访问和修改参数值

function validate(min: number, max: number): ParameterDecorator {
   return function (
      target: any, // 被装饰的方法
      context: ClassMethodDecoratorContext // 装饰器上下文对象
   ): (this: any, ...args: any[]) => any {
      // 返回新的方法实现
      return function (this: any, ...args: any[]): any {
         // args[0] 是第一个参数的值
         const value = args[0];
         if (value < min || value > max) {
            throw new Error(`参数值必须在 ${min} 和 ${max} 之间`);
         }
         // 调用原始方法，保持 this 上下文
         return target.call(this, ...args);
      };
   };
}

class Example {
   // 参数装饰器 @validate(0, 120) 会应用到 age 参数上
   // 当调用 setAge 方法时，会先执行装饰器返回的函数
   // 这个函数会验证 age 参数是否在 0 到 120 之间
   setAge(@validate(0, 120) age: number): void {
      this.age = age;
   }
}
```

### 参数装饰器工厂

```typescript
function typeCheck(expectedType: string): ParameterDecorator {
   return function (
      target: any, // 被装饰的方法
      context: ClassMethodDecoratorContext // 装饰器上下文对象
   ): (this: any, ...args: any[]) => any {
      // 返回新的方法实现
      return function (this: any, ...args: any[]): any {
         // 获取参数值
         const value = args[0];
         // 检查参数类型
         if (typeof value !== expectedType) {
            throw new Error(`参数类型必须是 ${expectedType}`);
         }
         // 调用原始方法
         return target.call(this, ...args);
      };
   };
}

class Example {
   // 参数装饰器 @typeCheck("string") 会应用到 name 参数上
   // 当调用 setName 方法时，会先执行装饰器返回的函数
   // 这个函数会验证 name 参数的类型是否为 string
   setName(@typeCheck("string") name: string) {
      this.name = name;
   }
}
```

### 参数验证装饰器

```typescript
function validateParams(schema: Record<string, any>): ParameterDecorator {
   return function (
      target: any, // 被装饰的方法
      context: ClassMethodDecoratorContext // 装饰器上下文对象
   ): (this: any, ...args: any[]) => any {
      // 返回新的方法实现
      return function (this: any, ...args: any[]): any {
         // 从上下文中获取参数名称
         const paramNames = context.metadata?.paramNames || [];

         // 验证每个参数
         args.forEach((arg, index) => {
            const paramName = paramNames[index];
            const paramSchema = schema[paramName];

            if (paramSchema) {
               // 验证参数类型
               if (typeof arg !== paramSchema.type) {
                  throw new Error(
                     `参数 ${paramName} 的类型必须是 ${paramSchema.type}`
                  );
               }
               // 验证参数范围
               if (paramSchema.min !== undefined && arg < paramSchema.min) {
                  throw new Error(
                     `参数 ${paramName} 必须大于等于 ${paramSchema.min}`
                  );
               }
               if (paramSchema.max !== undefined && arg > paramSchema.max) {
                  throw new Error(
                     `参数 ${paramName} 必须小于等于 ${paramSchema.max}`
                  );
               }
            }
         });

         // 调用原始方法
         return target.call(this, ...args);
      };
   };
}

class User {
   // 参数装饰器 @validateParams 会应用到 createUser 方法的参数上
   // 当调用 createUser 方法时，会先执行装饰器返回的函数
   // 这个函数会根据 schema 验证每个参数
   @validateParams({
      name: { type: "string", min: 3 },
      age: { type: "number", min: 0, max: 120 },
   })
   createUser(name: string, age: number) {
      this.name = name;
      this.age = age;
   }
}
```

### 参数转换装饰器

参数装饰器还可以用于转换参数值：

```typescript
function transform(transformer: (value: any) => any): ParameterDecorator {
   return function (
      target: any,
      context: ClassMethodDecoratorContext
   ): (this: any, ...args: any[]) => any {
      return function (this: any, ...args: any[]): any {
         const transformedArgs = args.map((arg) => transformer(arg));
         return target.call(this, ...transformedArgs);
      };
   };
}

class Example {
   @transform((value: string) => value.trim())
   processName(name: string) {
      return name.toUpperCase();
   }
}
```

### 参数依赖注入装饰器

使用参数装饰器实现依赖注入：

```typescript
function inject(service: any): ParameterDecorator {
   return function (
      target: any,
      context: ClassMethodDecoratorContext
   ): (this: any, ...args: any[]) => any {
      return function (this: any, ...args: any[]): any {
         // 替换参数为服务实例
         const serviceInstance = new service();
         return target.call(this, serviceInstance, ...args.slice(1));
      };
   };
}

class DatabaseService {
   query() {
      return "查询结果";
   }
}

class UserService {
   @inject(DatabaseService)
   getUsers(db: DatabaseService) {
      return db.query();
   }
}
```

### 参数装饰器的最佳实践

1. **类型安全**：

   -  始终为装饰器参数提供正确的类型注解
   -  使用泛型来增强类型安全性

2. **错误处理**：

   -  提供清晰的错误信息
   -  在适当的时候抛出错误

3. **性能考虑**：

   -  避免在装饰器中进行复杂的计算
   -  缓存重复使用的值

4. **可组合性**：

   -  设计装饰器时考虑可组合性
   -  避免装饰器之间的副作用

5. **文档化**：
   -  为装饰器提供清晰的文档
   -  说明参数的要求和限制

## 总结

TypeScript 5.0 中的新装饰器语法提供了更强大和灵活的方式来修改类及其成员。主要优势包括：

1. 更简洁的语法
2. 更强大的类型检查
3. 更丰富的元数据访问
4. 更可预测的执行顺序
5. 更好的性能

通过合理使用新装饰器，我们可以实现更优雅的代码组织、更好的关注点分离和更强的类型安全。记住要遵循最佳实践，确保装饰器的使用能够真正提升代码质量。
