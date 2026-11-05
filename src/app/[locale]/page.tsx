import { notFound } from "next/navigation";

import { SurveyApp } from "@/components/survey/SurveyApp";
import { isLocale } from "@/survey/types";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SurveyApp initialLocale={locale} />;
}
