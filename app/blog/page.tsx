import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, ChevronRight } from "lucide-react";
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
              className="rounded-full border border-emerald-500/30 bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-300"
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
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  {post.category}
                </span>
              </div>
              <h2 className="pitch-heading mt-3 text-base leading-snug group-hover:text-emerald-200 transition-colors">
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
                <span className="flex items-center gap-1 font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
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
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400"
            >
              Zarejestruj się →
            </Link>
            <Link
              href="/o-nas"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 px-6 py-2.5 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
            >
              Dowiedz się więcej
            </Link>
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
