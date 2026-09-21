---
title: "在线编程练习平台"
description: "一个类似 LeetCode 的在线编程练习平台，支持多种语言代码执行和自动评测。"
techStack: ["React", "Node.js", "Docker", "PostgreSQL"]
githubUrl: "https://github.com/GDUE-Computer-Association/coding-platform"
screenshots:
  - "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=online%20coding%20platform%20IDE%20interface%20dark%20theme%20code%20editor&image_size=landscape_16_9"
year: 2025
leader: "王五"
---

## 项目简介

在线编程练习平台是计算机协会为校内同学开发的算法练习工具。平台内置题库，支持 C/C++、Java、Python、JavaScript 等多种语言的在线编译和执行。

## 核心功能

- **题库系统**：按难度和标签分类的编程题目
- **在线编译**：使用 Docker 沙箱安全执行用户代码
- **自动评测**：支持时间限制和内存限制
- **排行榜**：按通过题目数和用时排名
- **讨论区**：每道题目下方的讨论功能

## 技术方案

后端使用 Node.js + Express，代码执行通过 Docker 容器隔离实现。数据库使用 PostgreSQL 存储题目、提交记录和用户数据。
