import Link from "next/link";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border border-zinc-200/80 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-emerald-50 hover:border-emerald-200/80",
        className
      )}
    >
      {children}
    </Link>
  );
}
