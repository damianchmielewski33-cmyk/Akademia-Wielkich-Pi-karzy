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
        "rounded-lg border border-emerald-200/80 bg-white/90 px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-50",
        className
      )}
    >
      {children}
    </Link>
  );
}
