---
title: "React 19 新特性解析"
excerpt: "React 19 带来了许多令人兴奋的新特性，包括 Actions、useFormStatus、useOptimistic 等。本文将深入解析这些新特性及其使用场景。"
date: "2026-03-10"
tags: ["React", "前端", "JavaScript"]
author: "技术部 - 张三"
---

# React 19 新特性解析

React 19 是 React 框架的一次重要更新，引入了许多新特性和改进。本文将介绍其中最重要的几个变化。

## Actions（动作）

React 19 引入了 Actions 概念，简化了异步操作的处理。你可以直接在表单提交时使用异步函数。

```tsx
function UpdateName() {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const error = await updateName(name);
      if (error) {
        setError(error);
        return;
      }
      redirect("/path");
    });
  };

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleSubmit} disabled={isPending}>
        Update
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
```

## useFormStatus Hook

`useFormStatus` 是一个新增的 Hook，用于获取表单的提交状态，无需通过 props 传递。

```tsx
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "提交中..." : "提交"}
    </button>
  );
}
```

## useOptimistic Hook

`useOptimistic` 提供了一种实现乐观更新的方式，让 UI 在异步操作完成前就给出反馈。

```tsx
function ThumbsUp() {
  const [optimisticThumbsUp, addOptimisticThumbsUp] = useOptimistic(
    thumbsUp,
    (currentState, optimisticValue) => currentState + optimisticValue
  );

  return (
    <button
      onClick={async () => {
        addOptimisticThumbsUp(1);
        await thumbsUpAction();
      }}
    >
      👍 {optimisticThumbsUp}
    </button>
  );
}
```

## 总结

React 19 的新特性大幅简化了异步操作和表单处理的复杂度。`Actions`、`useFormStatus` 和 `useOptimistic` 让开发者能够更专注于业务逻辑，而非状态管理。

建议大家在项目中逐步尝试这些新特性，体验更简洁的 React 开发方式。
