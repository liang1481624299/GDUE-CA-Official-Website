/**
 * 通用工具函数
 * cn: 合并 className 并处理 Tailwind CSS 类名冲突
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
