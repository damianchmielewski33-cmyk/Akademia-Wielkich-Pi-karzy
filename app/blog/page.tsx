import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PitchCard, PitchPageHero } from "@/components/ui/pitch-card";
import { blogPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog – Akademia Wielkich Piłkarzy",
  description:
    "Artykuły o piłce nożnej, treningu, taktyce, zdrowiu i organizacji meczów. Praktyczna wiedza dla amatorskich piłkarzy — wskazówki treningowe, porady żywieniowe i taktyczne.",
};

const categories = Array.from(new Set(blogPosts.map((p) => p.category)));

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogPage() {
  const sorted = [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <div className="awp-page awp-page--default">
      <PitchPageHero
        title="Blog akademii"
        subtitle="Artykuły o piłce nożnej, treningu, taktyce i społeczności amatorskiego futbolu."
      />

      {/* Kategorie */}
      <div className="mx-auto mt-6 max-w-4xl">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Lista artykułów */}
      <div className="mx-auto mt-8 max-w-4xl grid gap-5 sm:grid-cols-2">
        {sorted.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
            <PitchCard
              className="h-full transition-transform group-hover:-translate-y-0.5"
              contentClassName="p-5 sm:p-6 flex flex-col h-full"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-200">
                  {post.category}
                </span>
              </div>
              <h2 className="pitch-heading mt-3 text-base leading-snug transition-colors group-hover:text-[var(--mp-teal-dark)]">
                {post.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-emerald-100/75">{post.excerpt}</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-emerald-100/60">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    {formatDate(post.publishedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {post.readingTimeMin} min
                  </span>
                </div>
                <span className="flex items-center gap-1 font-medium text-[var(--mp-teal-dark)] transition-colors group-hover:text-[var(--mp-teal)]">
                  Czytaj <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </PitchCard>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="mx-auto mt-10 max-w-4xl">
        <PitchCard contentClassName="p-6 sm:p-8 text-center">
          <p className="text-sm text-emerald-100/90 font-medium">
            Chcesz dołączyć do Akademii Wielkich Piłkarzy?
          </p>
          <p className="mt-1 text-sm text-emerald-100/70">
            Zarejestruj się i zacznij grać z nami już dziś.
          </p>
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="rounded-full font-bold">
              <Link href="/register">Zarejestruj się →</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full font-bold">
              <Link href="/o-nas">Dowiedz się więcej</Link>
            </Button>
          </div>
        </PitchCard>
      </div>

      <p className="mt-8 text-center">
        <Link href="/" className="pitch-link text-sm">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}
