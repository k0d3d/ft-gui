import { performance } from 'node:perf_hooks';

export interface StartupMetric {
  name: string;
  ms: number;
}

const startupStart = performance.now();
const marks = new Map<string, number>();

export function markStartup(name: string): void {
  const ms = performance.now() - startupStart;
  marks.set(name, ms);
  if (process.env.FT_GUI_PROFILE_STARTUP === '1') {
    console.log(`[perf] ${name}: ${ms.toFixed(1)}ms`);
  }
}

export function getStartupMetrics(): StartupMetric[] {
  return [...marks.entries()]
    .map(([name, ms]) => ({ name, ms: Math.round(ms * 10) / 10 }))
    .sort((a, b) => a.ms - b.ms);
}
