import { getDictionary } from "@/i18n/dictionary";
import { getAllBlogPosts, getAllBlogTags } from "@/lib/content";
import { PageHeader } from "@/components/shared/PageHeader";
import { BlogList } from "@/components/blog/BlogList";

/**
 * 技术博客列表页 - 文章卡片列表，支持标签筛选
 */
export default async function BlogPage() {
  const dict = await getDictionary();
  const posts = getAllBlogPosts();
  const tags = getAllBlogTags();

  return (
    <>
      <PageHeader title={dict.blog.title} subtitle={dict.blog.subtitle} />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <BlogList posts={posts} tags={tags} />
      </div>
    </>
  );
}
