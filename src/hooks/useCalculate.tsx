import { useQueries, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";
import {
  type Asset,
  type CoinbaseTransaction,
  type PortfolioItem,
} from "~/components";
import { type StorageTransaction } from "~/components/useTransactions";
import { z } from "zod";

const dateNumberSchema = z.array(
  z.tuple([z.number().transform((v) => new Date(v)), z.number()])
);
const dateNulllableNumberSchema = z.array(
  z.tuple([z.number().transform((v) => new Date(v)), z.number().nullable()])
);
const marketChartSchema = z.object({
  prices: dateNumberSchema,
  market_caps: dateNulllableNumberSchema, // No clue why only this nullable?
  total_volumes: dateNumberSchema,
});
type MarketChart = z.infer<typeof marketChartSchema>;

const coinListSchema = z.array(
  z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
  })
);
type CoinList = z.infer<typeof coinListSchema>;

const getMarketHistory = async (name: string) => {
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${name}/market_chart?vs_currency=usd&days=max`
  );
  const parsed = marketChartSchema.safeParse(res.data);
  if (!parsed.success) {
    console.error(parsed.error);
    return { prices: [], market_caps: [], total_volumes: [] } as MarketChart;
  }
  return parsed.data;
};

const getCoinList = async () => {
  const res = await axios.get("https://api.coingecko.com/api/v3/coins/list");
  const parsed = coinListSchema.safeParse(res.data);
  if (!parsed.success) {
    console.error(parsed.error);
    return [] as CoinList;
  }
  return parsed.data;
};

export function useCalculate(transactions: StorageTransaction[]) {
  const coinList = useQuery({
    staleTime: Infinity,
    queryKey: ["coinList"],
    queryFn: () => getCoinList(),
  });

  const coinIds = useMemo(() => {
    if (coinList.data == undefined) return new Set<string>();
    // reverse because usually better coins are on top?
    return coinList.data.reduce((acc, val) => {
      acc.add(val.id);
      return acc;
    }, new Set<string>());
  }, [coinList]);

  const portfolio = useMemo(() => {
    if (!transactions) return [];

    const unique = transactions.reduce((acc, val) => {
      if (coinIds.has(val.coinId)) acc.add(val.coinId);
      return acc;
    }, new Set<string>());
    const percentTarget = unique.size == 0 ? 1 : 1 / unique.size;
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
    return Array.from(items.values());
  }, [transactions, coinIds]);

  const coinGeckoMarketHistoryMap = useQueries({
    queries: portfolio.map((item) => ({
      staleTime: Infinity,
      queryKey: ["marketHistory", item.name],
      queryFn: () => getMarketHistory(item.name),
    })),
  });
  const isLoading = coinGeckoMarketHistoryMap.some((r) => r.isLoading);
  const timeSeriesMap = coinGeckoMarketHistoryMap.reduce((acc, val, idx) => {
    const itemName = portfolio?.[idx]?.name;
    if (!itemName) return acc;
    const newData = val.data?.prices.map((r) => {
      return {
        timestamp: r[0],
        value: r[1],
      };
    });
    if (newData == null) return acc;
    acc.set(itemName, newData);
    return acc;
  }, new Map<string, CoinbaseTransaction[]>());

  const assets: Asset[] = portfolio.map((p) => {
    const market = timeSeriesMap.get(p.name);
    if (!market)
      return {
        symbol: p.symbol,
        name: p.name,
        history: [],
        totalValue: 0,
        totalSpent: 0,
        percentTarget: p.percentTarget,
      };
    const history: CoinbaseTransaction[] = [];
    let totalSpent = 0;
    let buyIndex = 0;
    let cummulativeAmmount = 0;
    const firstBuyDate = p.coinbaseTransactions?.[0]?.timestamp;
    market.forEach((a) => {
      const currentCoinbaseTransaction = p.coinbaseTransactions[buyIndex];
      if (!firstBuyDate || a.timestamp < firstBuyDate) return;
      if (
        buyIndex < p.coinbaseTransactions.length &&
        currentCoinbaseTransaction &&
        currentCoinbaseTransaction.timestamp <= a.timestamp
      ) {
        totalSpent += currentCoinbaseTransaction.value * a.value;
        cummulativeAmmount += currentCoinbaseTransaction.value;
        buyIndex += 1;
      }
      history.push({
        timestamp: a.timestamp,
        value: cummulativeAmmount * a.value,
      });
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

  const sumTotalValue = assets.reduce((acc, val) => acc + val.totalValue, 0);
  const sumTotalCost = assets.reduce((acc, val) => acc + val.totalSpent, 0);

  return { assets, sumTotalCost, sumTotalValue, isLoading };
}
