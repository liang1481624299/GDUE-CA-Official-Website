---
title: "校园选课助手"
description: "一个帮助学生更合理地规划选课的 Web 应用，支持课程搜索、评分查看和课表生成。"
techStack: ["React", "TypeScript", "Next.js", "Tailwind CSS"]
githubUrl: "https://github.com/GDUE-Computer-Association/course-helper"
demoUrl: "https://course.gdueca.dev"
screenshots:
  - "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=web%20app%20screenshot%20course%20selection%20interface%20clean%20modern%20blue%20theme&image_size=landscape_16_9"
year: 2025
leader: "张三"
---

## 项目简介

校园选课助手是计算机协会技术部开发的一款选课辅助工具。它帮助学生更合理地规划选课方案，提供课程搜索、历史评分查看、课表冲突检测等功能。

## 核心功能

- **课程搜索**：按课程名称、教师、学分等多维度搜索
- **评分查看**：展示历史学期课程评分与评价
- **课表生成**：可视化课表，自动检测时间冲突
- **选课收藏**：收藏感兴趣的课程，随时对比

## 技术方案

前端使用 Next.js App Router + Tailwind CSS 构建，数据通过爬取学校教务系统获取并存储在本地数据库中。整个应用部署在 Cloudflare Pages 上，访问速度快。
