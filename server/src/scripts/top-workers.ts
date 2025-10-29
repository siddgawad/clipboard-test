

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Shift, Worker } from '@prisma/client';

import { PrismaModule } from '../modules/prisma/prisma.module';
import { getPage } from '../modules/shared/pagination';
import { Page } from '../modules/shared/shared.types';
import { ShiftsModule } from '../modules/shifts/shifts.module';
import { ShiftsService } from '../modules/shifts/shifts.service';
import { WorkersModule } from '../modules/workers/workers.module';
import { WorkersService } from '../modules/workers/workers.service';

@Module({
  imports: [PrismaModule, WorkersModule, ShiftsModule],
})
class TopWorkersScriptModule {}

function isCompletedShift(s: Shift, nowMs: number): boolean {
  if (s.cancelledAt) return false;
  if (s.workerId === null) return false;
  const end = new Date(s.endAt).getTime();
  return Number.isFinite(end) && end < nowMs;
}

async function gatherAllPages<T>(
  firstPage: Page,
  fetchPage: (page: Page) => Promise<{ data: T[]; nextPage?: Page }>,
): Promise<T[]> {
  const out: T[] = [];
  let page = firstPage;
  while (true) {
    const { data, nextPage } = await fetchPage(page);
    out.push(...data);
    if (!nextPage) break;
    page = nextPage;
  }
  return out;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(TopWorkersScriptModule, {
    logger: ['error', 'warn'],
  });

  try {
    const workersService = app.get(WorkersService);
    const shiftsService = app.get(ShiftsService);

    const firstPage = getPage(1, 0);

    const workers: Worker[] = await gatherAllPages(firstPage, (page) =>
      workersService.get({ page }),
    );

    const shifts: Shift[] = await gatherAllPages(firstPage, (page) =>
      shiftsService.get({ page, filters: {} }),
    );

    const ACTIVE = 0 as const;
    const nowMs = Date.now();

    const active = new Map<number, Worker>();
    for (const w of workers) if (w.status === ACTIVE) active.set(w.id, w);

    const counts = new Map<number, number>();
    const seen = new Set<number>();

    for (const s of shifts) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      if (!isCompletedShift(s, nowMs)) continue;
      const wid = s.workerId!;
      if (!active.has(wid)) continue;
      counts.set(wid, (counts.get(wid) ?? 0) + 1);
    }

    const top3 = Array.from(counts.entries())
      .map(([workerId, total]) => ({
        name: active.get(workerId)?.name ?? `Worker ${workerId}`,
        shifts: total,
      }))
      .sort((a, b) => b.shifts - a.shifts)
      .slice(0, 3);

    // EXACT output required
    // [
    //   { name: "Dmitri David", shifts: 10 },
    //   { name: "Chike Williams", shifts: 7 },
    //   { name: "Fatima Khan", shifts: 6 }
    // ]
    console.log(JSON.stringify(top3, null, 2));
  } finally {
    await app.close();
  }
}

main().catch(() => process.exit(1));
