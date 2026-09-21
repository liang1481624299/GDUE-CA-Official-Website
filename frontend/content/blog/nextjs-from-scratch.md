---
title: "从零搭建 Next.js 项目"
excerpt: "本文介绍如何使用 Next.js App Router 从零搭建一个现代化的全栈应用，涵盖项目初始化、路由、布局、数据获取等核心概念。"
date: "2026-02-20"
tags: ["Next.js", "前端", "全栈"]
author: "技术部 - 李四"
---

# 从零搭建 Next.js 项目

Next.js 是目前最流行的 React 全栈框架之一。本文将带你从零开始搭建一个 Next.js 项目。

## 项目初始化

使用 `create-next-app` 脚手架工具快速创建项目：

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
```

这会创建一个包含 TypeScript、Tailwind CSS 和 App Router 的 Next.js 项目。

## App Router 路由系统

Next.js 13+ 引入了 App Router，使用文件系统路由：

- `app/page.tsx` - 首页
- `app/about/page.tsx` - 关于页面
- `app/blog/[slug]/page.tsx` - 动态路由

## 布局与嵌套

App Router 使用 `layout.tsx` 定义布局，布局会包裹所有子路由：

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

## Server Components 与 Client Components

App Router 默认使用 Server Components，在服务端渲染。需要交互的组件使用 `"use client"` 指令：

```tsx
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## 数据获取

在 Server Components 中可以直接使用 `async/await` 获取数据：

```tsx
async function getPosts() {
  const res = await fetch("https://api.example.com/posts");
  return res.json();
}

export default async function Page() {
  const posts = await getPosts();
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

## 总结

Next.js App Router 提供了简洁而强大的全栈开发体验。通过文件系统路由、Server Components 和内置的数据获取支持，开发者可以快速构建高性能的 Web 应用。
