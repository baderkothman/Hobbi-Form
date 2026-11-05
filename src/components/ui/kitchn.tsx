"use client";

// The one place that adapts Kitchn (npm: kitchn) to this product. The rest of the
// app imports controls from here, so each library gap below is fixed once:
//  - KitchnProvider injects a global reset that overrides Tailwind and hardcodes
//    text-align: left, breaking RTL. We use its theme layer without the reset.
//  - Physical margins and text-align on Checkbox and Note are made logical.
//  - Button, Input and Textarea remove the focus outline, so we restore one.
//  - Ghost Button's hover colours fail contrast on this palette, so we replace them.
//  - Checkbox puts role="checkbox" on its label around a zero-sized native input.
//    We remove that duplicate role and make the real input cover the whole row.
//  - Font sizes reach 16px, which stops iOS zooming the page on focus.
import type { ReactNode } from "react";
import kitchn, {
  Button as KitchnButton,
  Checkbox as KitchnCheckbox,
  CheckboxCheck,
  CheckboxCheckmark,
  CheckboxContent,
  createTheme,
  css,
  Fieldset as KitchnFieldset,
  Input as KitchnInput,
  InputField,
  mainTheme,
  Note as KitchnNote,
  NoteContent,
  Progress as KitchnProgress,
  shouldForwardProp,
  StyledCheckbox,
  StyleSheetManager,
  Textarea as KitchnTextarea,
  ThemeProvider,
} from "kitchn";

// Kitchn's naming runs from "darkest" (page background) to "lightest"
// (foreground), so these are correct for a light interface. Its helpers parse
// rgb() strings, so hex values are not an option here.
export const hobbiTheme = createTheme({
  name: "hobbi",
  family: {
    ...mainTheme.family,
    primary: "var(--font-alexandria), system-ui, sans-serif",
  },
  colors: {
    layout: {
      darkest: "rgb(255, 255, 255)",
      darker: "rgb(235, 243, 241)",
      dark: "rgb(120, 148, 142)",
      light: "rgb(90, 120, 114)",
      lighter: "rgb(8, 127, 114)",
      lightest: "rgb(8, 127, 114)",
    },
    text: {
      lightest: "rgb(6, 42, 38)",
      lighter: "rgb(40, 70, 65)",
      light: "rgb(72, 98, 93)",
      dark: "rgb(72, 98, 93)",
      darker: "rgb(90, 120, 114)",
      darkest: "rgb(255, 255, 255)",
    },
    accent: {
      primary: "rgb(8, 127, 114)",
      secondary: "rgb(5, 95, 86)",
      success: "rgb(5, 95, 86)",
      warning: "rgb(146, 84, 0)",
      danger: "rgb(180, 35, 24)",
      info: "rgb(5, 95, 86)",
      light: "rgb(255, 255, 255)",
      dark: "rgb(6, 42, 38)",
    },
  },
});

const themes = { dark: hobbiTheme };

export function KitchnThemeProvider({ children }: { children: ReactNode }) {
  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp} enableVendorPrefixes>
      <ThemeProvider themes={themes}>{children}</ThemeProvider>
    </StyleSheetManager>
  );
}

const focusRing = css`
  outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
  outline-offset: 2px;
`;

export const Button = kitchn(KitchnButton)`
  min-height: 48px;
  padding-inline: 22px;
  border-radius: 999px;
  font-size: 1rem;
  line-height: 1.4;
  transition-property: background-color, border-color, color;

  &:focus-visible {
    ${focusRing}
  }

  /* Kitchn's ghost hover is a 25% tint of the text colour, which fails AA at 3.46:1. */
  &:hover:not(:disabled) {
    ${({ variant, theme }) =>
      variant === "ghost"
        ? `background: ${theme.colors.layout.darker}; color: ${theme.colors.accent.secondary};`
        : `background: ${theme.colors.accent.secondary};`}
  }

  /* Text-only buttons line their text up with the column, not their padding. */
  ${({ variant }) => variant === "ghost" && "padding-inline: 12px;"}

  &[data-edge="start"] {
    margin-inline-start: -12px;
  }

  &[data-edge="end"] {
    margin-inline-end: -12px;
  }
`;

export const TextInput = kitchn(KitchnInput)`
  ${InputField}& {
    width: 100%;
    font-size: 1rem;
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.layout.darkest};
    color: ${({ theme }) => theme.colors.text.lightest};

    &:focus-visible {
      ${focusRing}
    }

    &[aria-invalid="true"] {
      border-color: ${({ theme }) => theme.colors.accent.danger};
    }
  }
`;

export const TextArea = kitchn(KitchnTextarea)`
  display: block;
  font-size: 1rem;
  line-height: 1.6;
  min-height: 132px;
  padding: 12px 14px;
  border-radius: 12px;
  user-select: auto;
  resize: vertical;
  font-family: inherit;
  transition-property: border-color;

  &:focus-visible {
    ${focusRing}
  }

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.accent.danger};
  }
`;

/** Shared with the native radio rows in fields.tsx so both controls read as one. */
export const OPTION_ROW_CLASS = "hobbi-option";

const StyledOptionCheckbox = kitchn(KitchnCheckbox)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  user-select: auto;

  ${CheckboxCheck} {
    position: static;
    flex: none;
    padding: 0;
    margin: 0;
  }

  ${StyledCheckbox} {
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
  }

  ${CheckboxContent} {
    flex: 1;
    margin: 0;
    font-size: 1rem;
    line-height: inherit;
  }

  ${CheckboxCheckmark} {
    width: 22px;
    height: 22px;
    border-radius: 6px;
  }
`;

type OptionCheckboxProps = {
  checked: boolean;
  atLimit?: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
};

export function OptionCheckbox({
  checked,
  atLimit,
  onChange,
  children,
}: OptionCheckboxProps) {
  // null (not undefined) survives styled-components' prop filter, overrides
  // Kitchn's hardcoded role, and React then omits the attributes altogether.
  const withoutDuplicateRole = {
    role: null,
    "aria-checked": null,
  } as unknown as object;

  return (
    <StyledOptionCheckbox
      {...withoutDuplicateRole}
      className={OPTION_ROW_CLASS}
      data-at-limit={atLimit || undefined}
      checked={checked}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.checked)
      }
    >
      {children}
    </StyledOptionCheckbox>
  );
}

const StyledNote = kitchn(KitchnNote)`
  display: flex;
  width: 100%;
  font-size: 0.9375rem;
  font-weight: 400;
  line-height: 1.6;
  padding: 12px 14px;
  user-select: auto;

  ${NoteContent} {
    text-align: start;
    line-height: inherit;
  }

  & > div:first-child {
    flex: 1;
    align-items: flex-start;
  }
`;

export const Note = StyledNote;

const StyledProgress = kitchn(KitchnProgress)`
  height: 6px;

  &::-webkit-progress-bar {
    background-color: ${({ theme }) => theme.colors.layout.darker};
  }

  &::-webkit-progress-value {
    background: ${({ theme }) => theme.colors.accent.primary};
    transition: width 0.3s ease-out;
  }

  &::-moz-progress-bar {
    border-radius: 5px;
    background: ${({ theme }) => theme.colors.accent.primary};
  }

  background-color: ${({ theme }) => theme.colors.layout.darker};
  border-radius: 5px;
  overflow: hidden;
`;

/**
 * Decorative only. Kitchn's role="progressbar" wrapper can't be given an
 * accessible name, so assistive tech gets the visible step counter instead.
 */
export function ProgressBar({ value, max }: { value: number; max: number }) {
  return (
    <div aria-hidden="true">
      <StyledProgress value={value} max={max} />
    </div>
  );
}

export const Card = kitchn(KitchnFieldset.Container)`
  border-color: rgb(213, 227, 224);
  border-radius: 14px;
`;
export const CardContent = kitchn(KitchnFieldset.Content)`
  padding: 20px;
`;
