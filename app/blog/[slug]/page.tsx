import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PitchCard, pitchLabelClass } from "@/components/ui/pitch-card";
import { blogPosts, getBlogPost, getRecentPosts } from "@/lib/blog-posts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Blog Akademii Wielkich Piłkarzy`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      locale: "pl_PL",
    },
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderContent(content: string) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="pitch-heading mt-8 mb-3 text-lg sm:text-xl">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mt-6 mb-2 text-base font-semibold text-white">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      elements.push(
        <p key={i} className="mt-4 font-semibold text-white">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="mt-3 space-y-1.5 pl-4">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm leading-relaxed text-emerald-100/85">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\. /.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="mt-3 space-y-1.5 pl-5 list-decimal marker:text-emerald-400">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed text-emerald-100/85 pl-1">
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    } else if (line.trim() !== "") {
      elements.push(
        <p
          key={i}
          className="mt-3 text-sm leading-relaxed text-emerald-100/85"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }

    i++;
  }

  return elements;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const recent = getRecentPosts(3).filter((p) => p.slug !== slug);

  const currentIndex = blogPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;

  return (
    <div className="awp-page awp-page--narrow">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-emerald-100/60">
        <Link href="/blog" className="pitch-link">
          Blog
        </Link>
        {" / "}
        <span className="text-emerald-100/40">{post.category}</span>
      </nav>

      {/* Header */}
      <PitchCard contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>{post.category}</span>
        <h1 className="pitch-heading mt-3 text-2xl sm:text-3xl leading-tight">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-emerald-100/60">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {formatDate(post.publishedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.readingTimeMin} min czytania
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-emerald-100/75 font-medium border-l-2 border-emerald-500 pl-4">
          {post.excerpt}
        </p>
      </PitchCard>

      {/* Treść artykułu */}
      <PitchCard className="mt-5" contentClassName="p-6 sm:p-8">
        <article>{renderContent(post.content)}</article>
      </PitchCard>

      {/* Nawigacja prev/next */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {prevPost && (
          <Link href={`/blog/${prevPost.slug}`} className="group block">
            <PitchCard contentClassName="p-4 sm:p-5">
              <p className="flex items-center gap-1 text-xs text-emerald-100/60">
                <ChevronLeft className="h-3.5 w-3.5" /> Poprzedni artykuł
              </p>
              <p className="mt-1 text-sm font-semibold text-white leading-snug group-hover:text-emerald-200 transition-colors">
                {prevPost.title}
              </p>
            </PitchCard>
          </Link>
        )}
        {nextPost && (
          <Link href={`/blog/${nextPost.slug}`} className="group block sm:col-start-2">
            <PitchCard contentClassName="p-4 sm:p-5 text-right">
              <p className="flex items-center justify-end gap-1 text-xs text-emerald-100/60">
                Następny artykuł <ChevronRight className="h-3.5 w-3.5" />
              </p>
              <p className="mt-1 text-sm font-semibold text-white leading-snug group-hover:text-emerald-200 transition-colors">
                {nextPost.title}
              </p>
            </PitchCard>
          </Link>
        )}
      </div>

      {/* Powiązane artykuły */}
      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="pitch-heading text-lg mb-4">Inne artykuły</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {recent.slice(0, 2).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group block">
                <PitchCard contentClassName="p-4 sm:p-5">
                  <span className="text-xs font-medium text-emerald-400">{p.category}</span>
                  <p className="mt-1 text-sm font-semibold text-white leading-snug group-hover:text-emerald-200 transition-colors">
                    {p.title}
                  </p>
                  <p className="mt-1 text-xs text-emerald-100/60">{formatDate(p.publishedAt)}</p>
                </PitchCard>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <PitchCard className="mt-8" contentClassName="p-6 text-center">
        <p className="text-sm font-medium text-white">Dołącz do Akademii Wielkich Piłkarzy</p>
        <p className="mt-1 text-sm text-emerald-100/70">
          Graj regularnie, śledź swoje statystyki i bądź częścią piłkarskiej społeczności.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="rounded-full font-bold">
            <Link href="/register">Zarejestruj się →</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full font-bold">
            <Link href="/blog">← Wszystkie artykuły</Link>
          </Button>
        </div>
      </PitchCard>
    </div>
  );
}
