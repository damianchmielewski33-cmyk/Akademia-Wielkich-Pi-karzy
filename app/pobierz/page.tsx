import type { Metadata } from "next";
import PobierzClient from "@/components/pobierz-client";

export const metadata: Metadata = {
  title: "Pobierz aplikację",
  description: "Aplikacja Android Akademii Wielkich Piłkarzy — pobierz APK na telefon.",
};

export default function PobierzPage() {
  return <PobierzClient />;
}
