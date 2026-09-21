---
title: "校园二手交易平台"
description: "一个面向校内学生的二手物品交易平台，支持商品发布、搜索和站内消息。"
techStack: ["Vue.js", "Node.js", "MongoDB", "Socket.io"]
githubUrl: "https://github.com/GDUE-Computer-Association/campus-market"
screenshots:
  - "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mobile%20app%20marketplace%20interface%20product%20cards%20clean%20design&image_size=landscape_16_9"
year: 2024
leader: "赵六"
---

## 项目简介

校园二手交易平台是计算机协会为校内学生打造的二手物品交易工具。学生可以发布闲置物品、浏览搜索商品、通过站内消息联系卖家。

## 核心功能

- **商品发布**：支持图片上传、分类标签、价格设定
- **搜索过滤**：按分类、价格区间、关键词搜索
- **站内消息**：实时聊天功能，基于 Socket.io
- **收藏功能**：收藏感兴趣的商品
- **交易评价**：交易完成后互相评价

## 技术方案

前端使用 Vue.js 3，后端使用 Node.js + Express，数据库为 MongoDB。实时通信基于 Socket.io 实现。
