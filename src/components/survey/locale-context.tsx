"use client";

import { createContext, useContext } from "react";

import { messages, type Messages } from "@/i18n/messages";
import type { Locale } from "@/survey/types";

const LocaleContext = createContext<Locale>("en");

export const LocaleProvider = LocaleContext.Provider;

export function useLocale(): { locale: Locale; t: Messages } {
  const locale = useContext(LocaleContext);
  return { locale, t: messages[locale] };
}
