/**
 * 内容加载器 - 使用 gray-matter 解析 Markdown 文件
 * 支持博客文章、项目、活动三种内容类型
 * 仅在 Server Components 中使用（使用 Node.js fs 模块）
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDirectory = path.join(process.cwd(), "content");

/** 博客文章类型 */
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  author: string;
  content: string;
}

/** 项目类型 */
export interface Project {
  slug: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  screenshots: string[];
  year: number;
  leader: string;
  content: string;
}

/** 活动类型 */
export interface ClubEvent {
  slug: string;
  title: string;
  type: "lecture" | "competition" | "recruitment" | "workshop";
  date: string;
  description: string;
  participants: number;
  images: string[];
  content: string;
}

/** 通用 Markdown 文件读取函数 */
function readMarkdownFile<T>(
  dir: string,
  slug: string
): (T & { content: string }) | null {
  const fullPath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  return { ...(data as T), slug, content } as T & { content: string };
}

/** 读取目录下所有 Markdown 文件 */
function readAllMarkdown<T>(subdir: string): (T & { slug: string; content: string })[] {
  const dir = path.join(contentDirectory, subdir);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      return readMarkdownFile<T>(dir, slug);
    })
    .filter((item): item is T & { slug: string; content: string } => item !== null);
}

// ============ 博客文章 ============

export function getAllBlogPosts(): BlogPost[] {
  return readAllMarkdown<Omit<BlogPost, "slug" | "content">>("blog")
    .map((item) => ({
      ...item,
      date: item.date || new Date().toISOString(),
      tags: item.tags || [],
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBlogPost(slug: string): BlogPost | null {
  const post = readMarkdownFile<Omit<BlogPost, "slug" | "content">>(
    path.join(contentDirectory, "blog"),
    slug
  );
  if (!post) return null;
  return {
    ...post,
    tags: post.tags || [],
  } as BlogPost;
}

/** 获取所有博客标签 */
export function getAllBlogTags(): string[] {
  const posts = getAllBlogPosts();
  const tags = new Set<string>();
  posts.forEach((post) => post.tags.forEach((tag) => tags.add(tag)));
  return Array.from(tags).sort();
}

// ============ 项目 ============

export function getAllProjects(): Project[] {
  return readAllMarkdown<Omit<Project, "slug" | "content">>("projects")
    .map((item) => ({
      ...item,
      techStack: item.techStack || [],
      screenshots: item.screenshots || [],
    }))
    .sort((a, b) => b.year - a.year);
}

export function getProject(slug: string): Project | null {
  const project = readMarkdownFile<Omit<Project, "slug" | "content">>(
    path.join(contentDirectory, "projects"),
    slug
  );
  if (!project) return null;
  return {
    ...project,
    techStack: project.techStack || [],
    screenshots: project.screenshots || [],
  } as Project;
}

/** 获取所有技术栈标签 */
export function getAllTechStacks(): string[] {
  const projects = getAllProjects();
  const stacks = new Set<string>();
  projects.forEach((p) => p.techStack.forEach((s) => stacks.add(s)));
  return Array.from(stacks).sort();
}

/** 获取所有项目年份 */
export function getAllProjectYears(): number[] {
  const projects = getAllProjects();
  const years = new Set<number>();
  projects.forEach((p) => years.add(p.year));
  return Array.from(years).sort((a, b) => b - a);
}

// ============ 活动 ============

export function getAllEvents(): ClubEvent[] {
  return readAllMarkdown<Omit<ClubEvent, "slug" | "content">>("events")
    .map((item) => ({
      ...item,
      images: item.images || [],
      participants: item.participants || 0,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getEvent(slug: string): ClubEvent | null {
  const event = readMarkdownFile<Omit<ClubEvent, "slug" | "content">>(
    path.join(contentDirectory, "events"),
    slug
  );
  if (!event) return null;
  return {
    ...event,
    images: event.images || [],
    participants: event.participants || 0,
  } as ClubEvent;
}
