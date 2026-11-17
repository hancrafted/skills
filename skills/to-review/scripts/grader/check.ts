import type { Page } from '@playwright/test';

export const MODES = ['decide', 'explain'] as const;
export const FIDELITY_RUNGS = ['diagram', 'wireframe', 'mock', 'prototype'] as const;
export const DEPTHS = ['simple', 'detailed', 'both'] as const;

export type Mode = (typeof MODES)[number];
export type FidelityRung = (typeof FIDELITY_RUNGS)[number];

export const asFidelityRung = (value: string | null | undefined): FidelityRung | null =>
  FIDELITY_RUNGS.find((rung) => rung === value) ?? null;

export interface Asked {
  readonly fidelity?: FidelityRung;
}

export const asMode = (value: string | null | undefined): Mode | null => MODES.find((mode) => mode === value) ?? null;

export interface LoadedPage {
  readonly page: Page;
  readonly html: string;
  readonly requests: readonly string[];
  readonly mode: Mode | null;
  readonly width: number;
  readonly asked: Asked;
}

export const applies = (check: Pick<Check, 'modes' | 'needs'>, mode: Mode | null, asked: Asked): boolean =>
  (check.modes === undefined || (mode !== null && check.modes.includes(mode))) &&
  (check.needs ?? []).every((need) => asked[need] !== undefined);

export interface Check<O = unknown> {
  readonly id: string;
  readonly summary: string;
  readonly modes?: readonly Mode[];
  readonly needs?: readonly (keyof Asked)[];
  observe(loaded: LoadedPage): Promise<O> | O;
  judge(observation: O): readonly string[];
}
