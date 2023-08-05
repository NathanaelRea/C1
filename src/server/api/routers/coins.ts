import { TRPCError } from "@trpc/server";
import { addDays, addWeeks } from "date-fns";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import {
  type CoinbaseTransaction,
  type Asset,
  type PortfolioItem,
  type StorageTransaction,
} from "~/utils/shared-schema";
import { getCoinList, getMarketHistory } from "~/utils/calculate";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const coinRouter = createTRPCRouter({
  get: publicProcedure.input(z.array(z.string())).query(async ({ input }) => {
    return await getParsedMarketHistory(input);
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
  getData: publicProcedure.query(async () => {
    const transactions = createDefaultData();
    const assets = await calculateAssets(transactions);

    const sumTotalValue = assets.reduce((acc, val) => acc + val.totalValue, 0);
    const sumTotalCost = assets.reduce((acc, val) => acc + val.totalSpent, 0);

    const timeSeriesData = calculateTimeSeriesData(assets);
    const baseSliceData = assets.map((a) => {
      return {
        symbol: a.symbol,
        totalValue: a.totalValue,
        totalSpent: a.totalSpent,
        percentTarget: a.percentTarget,
      };
    });
    const filteredTransactions = transactions.map((e) => {
      return {
        date: e.timeStamp,
        symbol: e.coinId,
        value: e.quantity,
      };
    });

    return {
      filteredTransactions,
      baseSliceData,
      timeSeriesData,
      sumTotalValue,
      sumTotalCost,
    };
  }),
});

async function calculateAssets(transactions: StorageTransaction[]) {
  const coinIds = new Set(transactions.map((t) => t.coinId));
  const percentTarget = coinIds.size == 0 ? 1 : 1 / coinIds.size;
  const items = new Map<string, PortfolioItem>();
  transactions.forEach((t) => {
    const p = items.get(t.coinId);
    if (p) {
      p.coinbaseTransactions.push({
        timestamp: t.timeStamp,
        value: t.quantity,
      });
    } else {
      items.set(t.coinId, {
        symbol: t.coinId,
        name: t.coinId,
        coinbaseTransactions: [
          {
            timestamp: t.timeStamp,
            value: t.quantity,
          },
        ],
        percentTarget,
      });
    }
  });
  const portfolio = Array.from(items.values());

  const marketHistory = await getParsedMarketHistory(
    portfolio.map((p) => p.symbol)
  );

  if (!marketHistory) return [] as Asset[];

  const assets: Asset[] = portfolio.map((p) => {
    const market = marketHistory.find((m) => m.id === p.symbol)?.history;
    if (!market)
      return {
        symbol: p.symbol,
        name: p.name,
        history: [],
        totalValue: 0,
        totalSpent: 0,
        percentTarget: p.percentTarget,
      };

    const firstBuyDate = p.coinbaseTransactions?.[0]?.timestamp;
    if (!firstBuyDate)
      return {
        symbol: p.symbol,
        name: p.name,
        history: [],
        totalValue: 0,
        totalSpent: 0,
        percentTarget: p.percentTarget,
      };

    let totalSpent = 0;
    let buyIndex = 0;
    let cummulativeAmmount = 0;
    const history = market
      .filter((m) => m.date.getTime() >= firstBuyDate.getTime())
      .map((marketTime) => {
        const transaction = p.coinbaseTransactions[buyIndex];
        if (
          transaction &&
          transaction.timestamp.getTime() <= marketTime.date.getTime()
        ) {
          totalSpent += transaction.value * marketTime.price;
          cummulativeAmmount += transaction.value;
          buyIndex += 1;
        }
        return {
          timestamp: marketTime.date,
          value: cummulativeAmmount * marketTime.price,
        };
      });
    const totalValue = history[history.length - 1]?.value ?? 0;
    return {
      symbol: p.symbol,
      name: p.name,
      history,
      totalValue,
      totalSpent,
      percentTarget: p.percentTarget,
    };
  });

  return assets;
}

function createDefaultData() {
  const coinIds = [
    { id: "bitcoin", amount: 0.015 },
    { id: "ethereum", amount: 0.25 },
    { id: "dogecoin", amount: 2_500 },
    { id: "monero", amount: 1.5 },
    { id: "chainlink", amount: 50 },
    { id: "the-graph", amount: 2_500 },
  ];

  const data: StorageTransaction[] = [];
  let date = new Date(Date.UTC(2023, 0, 1));
  const today = new Date();
  while (date < today) {
    for (const coin of coinIds) {
      data.push({
        coinId: coin.id,
        type: "Buy",
        quantity: coin.amount,
        totalPrice: -1,
        timeStamp: new Date(date),
      });
    }
    date = addWeeks(date, 1);
  }
  return data;
}

async function getParsedMarketHistory(coinIds: string[]) {
  const data = await getRawMarketHistory(coinIds);

  const parsed = coinIds.map((id) => {
    const unparsedHistory = data.filter((e) => e.coinId === id);
    return {
      id,
      history: unparsedHistory.map((h) => {
        return {
          date: h.date,
          price: h.priceUSD,
        };
      }),
    };
  });
  return parsed;
}

async function getRawMarketHistory(coinIds: string[]) {
  const coinsWithoutCache = await prisma.coin.findMany({
    select: { id: true },
    where: {
      AND: [{ id: { in: coinIds } }, { Price: { none: {} } }],
    },
  });

  // Not sure if I want to cache the data already retrived, and like only get what's needed from db
  // Probably not too bad, because we only round-trip if we have no data for a coin inside input list, only happens once
  await Promise.all(
    coinsWithoutCache.map(async (c) => {
      const history = await getMarketHistory(c.id);
      if (history.prices.length === 0)
        throw new TRPCError({ code: "BAD_REQUEST" });
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
    where: { coinId: { in: coinIds } },
    orderBy: { date: "asc" },
  });

  return marketHistory;
}

function calculateTimeSeriesData(assetHistory: Asset[]) {
  const maxHistoryLength = assetHistory.reduce(
    (acc, val) => Math.max(acc, val.history.length),
    0
  );
  const timeSeries = [] as CoinbaseTransaction[];
  let timestamp;
  for (let i = 0; i < maxHistoryLength; i += 1) {
    let value = 0;
    timestamp = undefined;
    for (const asset of assetHistory) {
      const ts = asset.history[asset.history.length - i - 1];
      if (!ts) continue;
      value += ts.value;
      timestamp = ts.timestamp;
    }
    if (timestamp) timeSeries.push({ timestamp, value });
  }
  if (timestamp)
    timeSeries.push({
      timestamp: addDays(timestamp, -1),
      value: 0,
    });
  return timeSeries.reverse();
}
