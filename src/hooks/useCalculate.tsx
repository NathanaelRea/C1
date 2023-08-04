import { useMemo } from "react";
import { type Asset, type PortfolioItem } from "~/components";
import { type StorageTransaction } from "~/components/useTransactions";
import { api } from "~/utils/api";

export function useCalculate(transactions: StorageTransaction[]) {
  const portfolio = useMemo(() => {
    if (!transactions) return [];

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
    return Array.from(items.values());
  }, [transactions]);

  const { data: marketHistory, isLoading } = api.coins.get.useQuery(
    portfolio.map((p) => p.symbol)
  );

  if (isLoading || !marketHistory)
    return {
      assets: [] as Asset[],
      sumTotalCost: 0,
      sumTotalValue: 0,
      isLoading: true,
    };

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

  const sumTotalValue = assets.reduce((acc, val) => acc + val.totalValue, 0);
  const sumTotalCost = assets.reduce((acc, val) => acc + val.totalSpent, 0);

  return { assets, sumTotalCost, sumTotalValue, isLoading };
}
