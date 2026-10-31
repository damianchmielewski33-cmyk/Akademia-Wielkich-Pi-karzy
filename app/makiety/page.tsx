import type { Metadata } from "next";
import { MockupStudio } from "@/components/makiety/mockup-studio";

export const metadata: Metadata = {
  title: "Makiety WWW, iOS i Android",
  description:
    "Wspólny ekosystem Akademii Wielkich Piłkarzy: portal WWW, iOS i Android — design system i makiety.",
  robots: { index: false, follow: false },
};

export default function MakietyPage() {
  return <MockupStudio />;
}
