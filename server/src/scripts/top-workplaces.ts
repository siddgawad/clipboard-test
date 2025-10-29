

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Shift, Workplace } from '@prisma/client';

import { PrismaModule } from '../modules/prisma/prisma.module';
import { getPage } from '../modules/shared/pagination';
import { Page } from '../modules/shared/shared.types';
import { ShiftsModule } from '../modules/shifts/shifts.module';
import { ShiftsService } from '../modules/shifts/shifts.service';
import { WorkplacesModule } from '../modules/workplaces/workplaces.module';
import { WorkplacesService } from '../modules/workplaces/workplaces.service';

@Module({
  imports: [PrismaModule, WorkplacesModule, ShiftsModule],
})
class TopWorkplacesScriptModule {}

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
  const app = await NestFactory.createApplicationContext(TopWorkplacesScriptModule, {
    logger: ['error', 'warn'],
  });

  try {
    const workplacesService = app.get(WorkplacesService);
    const shiftsService = app.get(ShiftsService);

    const firstPage = getPage(1, 0);

    const workplaces: Workplace[] = await gatherAllPages(firstPage, (page) =>
      workplacesService.get({ page }),
    );

    const shifts: Shift[] = await gatherAllPages(firstPage, (page) =>
      shiftsService.get({ page, filters: {} }),
    );

    const ACTIVE = 0 as const;
    const nowMs = Date.now();

    const active = new Map<number, Workplace>();
    for (const wp of workplaces) if (wp.status === ACTIVE) active.set(wp.id, wp);

    const counts = new Map<number, number>();
    const seen = new Set<number>();

    for (const s of shifts) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      if (!isCompletedShift(s, nowMs)) continue;
      if (!active.has(s.workplaceId)) continue;
      counts.set(s.workplaceId, (counts.get(s.workplaceId) ?? 0) + 1);
    }

    const top3 = Array.from(counts.entries())
      .map(([workplaceId, total]) => ({
        name: active.get(workplaceId)?.name ?? `Workplace ${workplaceId}`,
        shifts: total,
      }))
      .sort((a, b) => b.shifts - a.shifts)
      .slice(0, 3);

   //since output should be 
    // [
    //   { name: "Martian Hydro", shifts: 10 },
    //   { name: "Luna Greens", shifts: 7 },
    //   { name: "Red Diamond Mines", shifts: 6 }
    // ]
    console.log(JSON.stringify(top3, null, 2));
  } finally {
    await app.close();
  }
}

main().catch(() => process.exit(1));
