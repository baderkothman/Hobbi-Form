"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

import { TextInput } from "@/components/ui/kitchn";

import { useLocale } from "./locale-context";

type ContactInputProps = {
  id: string;
  name: string;
  inputRef: (element: HTMLElement | null) => void;
  value: string;
  allowEmail: boolean;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

type CountryOption = {
  iso: CountryCode;
  dialCode: string;
  name: string;
  search: string;
};

const DEFAULT_COUNTRY: CountryCode = "LB";
const COUNTRY_CODES = getCountries();
const DIAL_CODES = new Map(COUNTRY_CODES.map((iso) => [iso, getCountryCallingCode(iso)]));
const DIAL_PREFIXES = [...new Set(DIAL_CODES.values())].sort((a, b) => b.length - a.length);

function latinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

function dialCode(country: CountryCode): string {
  return DIAL_CODES.get(country) ?? DIAL_CODES.get(DEFAULT_COUNTRY)!;
}

function countryFromPhone(value: string, preferred: CountryCode = DEFAULT_COUNTRY): CountryCode {
  const parsed = parsePhoneNumberFromString(latinDigits(value));
  if (parsed?.country) return parsed.country;
  const digits = latinDigits(value).replace(/\D/g, "");
  if (!value.trim().startsWith("+")) return preferred;
  const prefix = DIAL_PREFIXES.find((code) => digits.startsWith(code));
  if (!prefix) return preferred;
  if (dialCode(preferred) === prefix) return preferred;
  return COUNTRY_CODES.find((country) => dialCode(country) === prefix) ?? preferred;
}

function localNumber(value: string, country: CountryCode): string {
  const normalized = latinDigits(value);
  if (!normalized.startsWith("+")) return normalized;
  const digits = normalized.replace(/\D/g, "");
  const code = dialCode(country);
  return digits.startsWith(code) ? digits.slice(code.length) : digits;
}

function countryOptions(locale: "en" | "ar"): CountryOption[] {
  const localNames = new Intl.DisplayNames([locale], { type: "region" });
  const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
  const arabicNames = new Intl.DisplayNames(["ar"], { type: "region" });
  return COUNTRY_CODES.map((iso) => {
    const name = localNames.of(iso) ?? iso;
    const code = dialCode(iso);
    return {
      iso,
      dialCode: code,
      name,
      search: `${name} ${englishNames.of(iso)} ${arabicNames.of(iso)} ${iso} +${code}`.toLocaleLowerCase(),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));
}

function CountryCodePicker({
  country,
  onSelect,
}: {
  country: CountryCode;
  onSelect: (country: CountryCode) => void;
}) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popupId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => countryOptions(locale), [locale]);
  const selected = options.find((option) => option.iso === country)!;
  const search = latinDigits(query).trim().toLocaleLowerCase();
  const filtered = options.filter((option) => option.search.includes(search.replace(/^\+/, "")));

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  const choose = (iso: CountryCode) => {
    onSelect(iso);
    setQuery("");
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onPopupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "Enter" && event.target === searchRef.current) {
      event.preventDefault();
      if (filtered[0]) choose(filtered[0].iso);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = [...rootRef.current!.querySelectorAll<HTMLButtonElement>(".country-code-option")];
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? Math.min(index + 1, buttons.length - 1) : Math.max(index - 1, 0);
    buttons[next]?.focus();
  };

  return (
    <div className="country-code-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        className="country-code-trigger"
        type="button"
        aria-label={`${t.contact.countryCode}: ${selected.name} +${selected.dialCode}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popupId}
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
      >
        <span dir="ltr">+{selected.dialCode}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </button>
      {open && (
        <div
          id={popupId}
          className="country-code-popup"
          role="dialog"
          aria-label={t.contact.countryCode}
          dir={locale}
          onKeyDown={onPopupKeyDown}
          onBlur={(event) => {
            if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpen(false);
          }}
        >
          <input
            ref={searchRef}
            className="country-code-search"
            type="search"
            autoComplete="off"
            aria-label={t.contact.searchCountry}
            placeholder={t.contact.searchCountry}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul className="country-code-list">
            {filtered.map((option) => (
              <li key={option.iso}>
                <button
                  className="country-code-option"
                  type="button"
                  aria-label={`${option.name} +${option.dialCode}`}
                  aria-current={option.iso === country ? "true" : undefined}
                  onClick={() => choose(option.iso)}
                >
                  <span>{option.name}</span>
                  <span dir="ltr">+{option.dialCode}</span>
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && <p className="country-code-empty">{t.contact.noCountries}</p>}
        </div>
      )}
    </div>
  );
}

export function ContactInput({
  id,
  name,
  inputRef,
  value,
  allowEmail,
  labelledBy,
  describedBy,
  invalid,
  onChange,
  onBlur,
}: ContactInputProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<"phone" | "email">(
    allowEmail && /[^+\d٠-٩۰-۹ ()-]/.test(value) ? "email" : "phone",
  );
  const remembered = useRef({ phone: mode === "phone" ? value : "", email: mode === "email" ? value : "" });
  const [country, setCountry] = useState<CountryCode>(() => countryFromPhone(value));

  const switchMode = (next: "phone" | "email") => {
    if (mode === next) return;
    remembered.current[mode] = value;
    setMode(next);
    onChange(remembered.current[next]);
  };

  const updatePhone = (raw: string) => {
    const normalized = latinDigits(raw);
    const digits = normalized.replace(/\D/g, "");
    if (!digits) {
      onChange("");
      return;
    }
    if (normalized.trim().startsWith("+")) {
      const detected = countryFromPhone(normalized, country);
      setCountry(detected);
      onChange(`+${digits}`);
      return;
    }
    onChange(`+${dialCode(country)}${digits}`);
  };

  const finishPhone = () => {
    // National trunk prefixes (for example Lebanon's leading 0) are omitted
    // from international numbers. Keep them while typing, then normalize.
    const parsed = parsePhoneNumberFromString(localNumber(value, country), country);
    if (parsed?.isPossible() && parsed.number !== value) onChange(parsed.number);
    onBlur();
  };

  const shared = {
    id,
    name,
    ref: inputRef,
    size: "large" as const,
    autoComplete: "off",
    autoCapitalize: "none" as const,
    autoCorrect: "off" as const,
    spellCheck: false,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    onBlur,
  };

  return (
    <>
      {allowEmail && (
        <div className="contact-method-switch" role="group" aria-label={t.contact.method}>
          <button type="button" aria-pressed={mode === "phone"} onClick={() => switchMode("phone")}>{t.contact.phone}</button>
          <button type="button" aria-pressed={mode === "email"} onClick={() => switchMode("email")}>{t.contact.email}</button>
        </div>
      )}
      {mode === "email" ? (
        <TextInput
          {...shared}
          value={value}
          dir="ltr"
          inputMode="email"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        />
      ) : (
        <div className="phone-number-control">
          <CountryCodePicker
            country={country}
            onSelect={(next) => {
              setCountry(next);
              if (value) onChange(`+${dialCode(next)}${localNumber(value, country).replace(/\D/g, "")}`);
            }}
          />
          <TextInput
            {...shared}
            className="phone-local-input"
            value={localNumber(value, country)}
            dir="ltr"
            inputMode="tel"
            placeholder={t.contact.phonePlaceholder}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => updatePhone(event.target.value)}
            onBlur={finishPhone}
          />
        </div>
      )}
    </>
  );
}
