import { chromium, type Browser, type Page } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { applies, asMode, type Asked, type Check, type LoadedPage, type Mode } from './check.ts';
import { combine, toReport, type Report, type WidthResult } from './report.pure.ts';

export const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
] as const;

export const launch = (): Promise<Browser> => chromium.launch();

type Viewport = (typeof VIEWPORTS)[number];

export interface OfflinePage {
  readonly page: Page;
  readonly requests: readonly string[];
}

export async function openOffline(browser: Browser, file: string, viewport: Viewport): Promise<OfflinePage> {
  const url = pathToFileURL(path.resolve(file)).href;
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const requests = new Set<string>();
  await context.route('**/*', (route) =>
    route.request().url() === url ? route.continue() : route.abort('blockedbyclient'),
  );
  const page = await context.newPage();
  page.on('request', (request) => {
    const requested = request.url();
    if (requested !== url && !/^(data|blob|about):/.test(requested)) requests.add(requested);
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  return { page, requests: [...requests] };
}

export interface GradedPage {
  readonly file: string;
  readonly asked?: Asked;
}

interface Target {
  readonly browser: Browser;
  readonly file: string;
  readonly asked: Asked;
}

async function open({ browser, file, asked }: Target, viewport: Viewport): Promise<LoadedPage> {
  const { page, requests } = await openOffline(browser, file, viewport);
  const mode = asMode(await page.evaluate(() => document.documentElement.getAttribute('data-mode')));
  return { page, html: await page.content(), requests, mode, width: viewport.width, asked };
}

async function atWidth(target: Target, check: Check, viewport: Viewport): Promise<WidthResult & { mode: Mode | null }> {
  const loaded = await open(target, viewport);
  const { width, mode, asked } = loaded;
  try {
    if (!applies(check, mode, asked)) return { width, mode, problems: null };
    return { width, mode, problems: check.judge(await check.observe(loaded)) };
  } catch (error) {
    return { width, mode, problems: [`the check crashed: ${(error as Error).message}`] };
  } finally {
    await loaded.page.context().close();
  }
}

export async function gradeFile(
  browser: Browser,
  checks: readonly Check[],
  { file, asked = {} }: GradedPage,
): Promise<Report> {
  const results = [];
  let mode: Mode | null = null;
  for (const check of checks) {
    const widths = [];
    for (const viewport of VIEWPORTS) widths.push(await atWidth({ browser, file, asked }, check, viewport));
    mode = widths[0].mode;
    results.push(combine(check, widths));
  }
  return toReport(path.resolve(file), mode, results);
}
