---
title: "TypeScript 类型体操技巧"
excerpt: "TypeScript 的高级类型系统非常强大，本文分享一些实用的类型体操技巧，帮助你写出更安全的类型代码。"
date: "2026-01-15"
tags: ["TypeScript", "前端", "类型系统"]
author: "技术部 - 王五"
---

# TypeScript 类型体操技巧

TypeScript 的类型系统是图灵完备的，这意味着你可以在类型层面进行复杂计算。本文介绍一些实用的类型技巧。

## 条件类型

条件类型让我们可以根据输入类型选择不同的输出类型：

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>;      // false
```

## 映射类型

映射类型可以遍历类型的属性并进行转换：

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Optional<T> = {
  [P in keyof T]?: T[P];
};

interface User {
  id: number;
  name: string;
  email: string;
}

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; readonly email: string }
```

## 模板字面量类型

TypeScript 4.1 引入了模板字面量类型，可以基于字符串创建新类型：

```typescript
type EmailDomain = `${string}@${string}.com`;
type PropertyName = `get${Capitalize<string>}`;

function createGetter<T extends string>(prop: T): PropertyName {
  return `get${prop.charAt(0).toUpperCase() + prop.slice(1)}` as PropertyName;
}
```

## infer 关键字

`infer` 让你在条件类型中提取类型的一部分：

```typescript
type ReturnType<T> = T extends (...args: never[]) => infer R ? R : never;

type UnpackPromise<T> = T extends Promise<infer U> ? U : T;

type R1 = ReturnType<() => string>;        // string
type R2 = UnpackPromise<Promise<number>>;   // number
```

## 总结

TypeScript 的类型系统非常强大，掌握这些技巧可以让你写出更安全、更优雅的代码。不过也要注意适度使用——过于复杂的类型体操可能会降低代码可读性。
