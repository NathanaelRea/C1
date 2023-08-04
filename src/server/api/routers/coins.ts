import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { getCoinList, getMarketHistory } from "~/utils/shared-schema";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const coinRouter = createTRPCRouter({
  get: publicProcedure.input(z.array(z.string())).query(async ({ input }) => {
    const coinsWithoutCache = await prisma.coin.findMany({
      select: { id: true },
      where: {
        AND: [{ id: { in: input } }, { Price: { none: {} } }],
      },
    });

    // Not sure if I want to cache the data already retrived, and like only get what's needed from db
    // Probably not too bad, because we only round-trip if we have no data for a coin inside input list, only happens once
    await Promise.all(
      coinsWithoutCache.map(async (c) => {
        const history = await getMarketHistory(c.id);
        if (history.prices.length === 0) throw new Error();
        const data = history.prices.map((e) => {
          return {
            coinId: c.id,
            date: e[0],
            priceUSD: e[1],
          };
        });
        await prisma.price.createMany({
          data,
          skipDuplicates: true,
        });
      })
    );

    const marketHistory = await prisma.price.findMany({
      select: {
        coinId: true,
        date: true,
        priceUSD: true,
      },
      where: { coinId: { in: input } },
      orderBy: { date: "asc" },
    });
    const parsed = input.map((id) => {
      const history = marketHistory.filter((e) => e.coinId === id);
      return {
        id,
        history: history.map((h) => {
          return {
            date: h.date,
            price: h.priceUSD,
          };
        }),
      };
    });
    return parsed;
  }),
  updateList: publicProcedure.query(async () => {
    const recentUpdate = await prisma.coin.findFirst({
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    if (
      recentUpdate != null &&
      new Date().getTime() - recentUpdate.updatedAt.getTime() < MINUTE
    )
      throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

    const newCoinList = await getCoinList();

    // Todo this is still trying to insert everything?
    await prisma.coin.createMany({
      data: newCoinList.map((c) => {
        return { id: c.id, name: c.name, symbol: c.symbol };
      }),
      skipDuplicates: true,
    });
    return true;
  }),
  updateRandomCoin: publicProcedure.query(async () => {
    const coinCount = (await prisma.coin.aggregate({ _count: true }))._count;
    if (coinCount == 0) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const recentUpdate = await prisma.price.findFirst({
      select: { date: true },
      orderBy: { date: "desc" },
    });
    if (
      recentUpdate != null &&
      new Date().getTime() - recentUpdate.date.getTime() < MINUTE
    )
      throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

    const randomOffset = Math.floor(Math.random() * coinCount);
    const randomCoins = await prisma.coin.findMany({
      select: { id: true },
      take: 10,
      skip: randomOffset,
      orderBy: { id: "asc" },
    });

    const marketHistory = await Promise.all(
      randomCoins.map(async (c) => {
        const history = await getMarketHistory(c.id);
        return history.prices.map((e) => {
          return {
            coinId: c.id,
            date: e[0],
            priceUSD: e[1],
          };
        });
      })
    );

    await Promise.all(
      marketHistory.map(async (h) => {
        await prisma.price.createMany({
          data: h,
          skipDuplicates: true,
        });
      })
    );
    return true;
  }),
});
