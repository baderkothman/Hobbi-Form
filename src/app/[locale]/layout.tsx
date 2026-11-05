import type { Metadata, Viewport } from "next";
import { Alexandria } from "next/font/google";
import { KitchnRegistry } from "kitchn/next/registry";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { KitchnThemeProvider } from "@/components/ui/kitchn";
import { messages } from "@/i18n/messages";
import { directionFor, isLocale, LOCALES } from "@/survey/types";

import "../globals.css";

// One family carries both scripts, so English and Arabic read as one voice.
const alexandria = Alexandria({
  subsets: ["latin", "arabic"],
  weight: "variable",
  variable: "--font-alexandria",
  display: "swap",
});

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type LayoutProps = {
  params: Promise<{ locale: string }>;
  children: ReactNode;
};

export async function generateMetadata({
  params,
}: Omit<LayoutProps, "children">): Promise<Metadata> {
  const { locale } = await params;
  const meta = isLocale(locale) ? messages[locale].meta : messages.en.meta;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { languages: { en: "/en", ar: "/ar" } },
    robots: { index: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#087F72",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ params, children }: LayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={directionFor(locale)} className={alexandria.variable}>
      <body>
        <KitchnRegistry>
          <KitchnThemeProvider>{children}</KitchnThemeProvider>
        </KitchnRegistry>
      </body>
    </html>
  );
}
