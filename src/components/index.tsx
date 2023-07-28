import { useQueries, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo, useRef, useState } from "react";
import { Indicator } from "./indicator";
import { SliceTable, TransactionTable } from "./tables";
import { Money, ColorMoney, ColorPercent } from "./money";
import { PieChart, TimeSeriesChart } from "./charts";
import LoadingDots from "./LoadingDots";
import { useTransactions } from "./useTransactions";
import Coinbase from "../assets/coinbase.favicon.ico";
import Image from "next/image";

export function Gain(value: number, cost: number) {
  return value - cost;
}

export function Return(value: number, cost: number) {
  return cost == 0 ? 0 : (value - cost) / cost;
}

export interface TimeSeriesData {
  date: Date;
  value: number;
}

export interface PortfolioItem {
  symbol: string;
  name: string;
  coinbaseTransactions: CoinbaseTransaction[];
  percentTarget: number;
  staking?: number;
}

export interface CoinbaseTransaction {
  timestamp: Date;
  value: number;
}

interface MarketChartResponse {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

type CoinListReponse = {
  id: string;
  symbol: string;
  name: string;
}[];

const getMarketHistory = async (name: string) => {
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${name}/market_chart?vs_currency=usd&days=max`
  );
  return res.data as MarketChartResponse;
};

const getCoinList = async () => {
  const res = await axios.get("https://api.coingecko.com/api/v3/coins/list");
  return res.data as CoinListReponse;
};

export interface Asset {
  symbol: string;
  name: string;
  history: CoinbaseTransaction[];
  totalSpent: number;
  totalValue: number;
  percentTarget: number;
}

export interface Slice {
  symbol: string;
  totalValue: number;
  gain: number;
  return: number;
  targetPercent: number;
  actualPercent: number;
  nextBuy: number;
}

export interface Transaction {
  date: Date;
  value: number;
  symbol: string;
}

function getTransactionArray(start: Date, end: Date) {
  const arr = [] as CoinbaseTransaction[];
  for (
    const dt = new Date(start);
    dt <= new Date(end);
    dt.setDate(dt.getDate() + 1)
  ) {
    arr.push({ timestamp: new Date(dt), value: 0 });
  }
  return arr;
}

export default function C1() {
  const [nextAlloc, setNextAlloc] = useState(250);
  const { transactions, handleImport } = useTransactions();

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

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
    const newData = val.data?.prices.map((r) => {
      return {
        timestamp: new Date(r[0]),
        value: r[1],
      };
    });
    if (itemName == null || newData == null) return acc;
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
      } as Asset;
    const history = [] as CoinbaseTransaction[];
    let totalSpent = 0;
    let buyIndex = 0;
    let cummulativeAmmount = 0;
    const firstBuyDate = p.coinbaseTransactions?.[0]?.timestamp;
    market.forEach((a) => {
      const currentCoinbaseTransaction = p.coinbaseTransactions[buyIndex];
      if (
        !firstBuyDate ||
        a.timestamp < firstBuyDate
        // !currentCoinbaseTransaction
      )
        return;
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
    } as Asset;
  });

  const sumTotalValue = assets.reduce((acc, val) => acc + val.totalValue, 0);
  const sumTotalCost = assets.reduce((acc, val) => acc + val.totalSpent, 0);

  const handleUpdateNextAlloc = (e: React.ChangeEvent<HTMLInputElement>) =>
    setNextAlloc(
      isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value)
    );
  const sumAllocation = assets.reduce(
    (acc, val) =>
      acc +
      Math.max(
        0,
        (sumTotalValue + nextAlloc) * val.percentTarget - val.totalValue
      ),
    0
  );

  const slices: Slice[] = assets
    .map((a) => {
      const allocation = Math.max(
        0,
        (sumTotalValue + nextAlloc) * a.percentTarget - a.totalValue
      );
      return {
        symbol: a.symbol,
        totalValue: a.totalValue,
        gain: Gain(a.totalValue, a.totalSpent),
        return: Return(a.totalValue, a.totalSpent),
        targetPercent: a.percentTarget,
        actualPercent: a.totalValue / sumTotalValue,
        nextBuy: (nextAlloc * allocation) / sumAllocation,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  function calculateTimeSeriesData(assetHistory: Asset[]) {
    const currentDate = assetHistory.reduce((acc, val) => {
      const valTimestamp = val.history[0]?.timestamp;
      if (valTimestamp && valTimestamp.getTime() < acc.getTime())
        acc = valTimestamp;
      return acc;
    }, new Date());
    currentDate.setDate(currentDate.getDate() - 1);
    const timeSeries = getTransactionArray(currentDate, new Date());
    for (const asset of assetHistory) {
      for (let i = 0; i < asset.history.length; i += 1) {
        // TODO make ts happy?
        const idx = timeSeries.length - i - 1;
        if (0 <= idx && idx < timeSeries.length) {
          timeSeries[idx].value +=
            asset.history[asset.history.length - i - 1]?.value ?? 0;
        }
      }
    }
    return timeSeries;
  }
  const timeSeriesData = calculateTimeSeriesData(assets);

  // TODO just use data from useTransactions?
  const flatTransactions = Object.values(portfolio)
    .flatMap((p) =>
      p.coinbaseTransactions.map((t) => {
        return {
          date: t.timestamp,
          value: t.value,
          symbol: p.symbol,
        } as Transaction;
      })
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="flex w-full justify-center">
      <div className="m-4 grid max-w-screen-xl flex-grow grid-cols-2 gap-6 sm:grid-cols-3 sm:p-8">
        <div className="col-span-2 sm:col-span-3">
          <div className="flex items-end gap-2">
            <h1 className="text-2xl font-bold text-white">Portfolio</h1>
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              ref={fileInputRef}
              hidden
            />
            <button
              className="flex items-center gap-2 rounded-md bg-fuchsia-700 px-2 py-1 text-sm text-white hover:bg-fuchsia-500"
              onClick={handleUploadButtonClick}
            >
              Import
              <Image src={Coinbase} alt="coinbase" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:col-span-3 sm:grid-cols-3">
          <Indicator
            name="Current Value"
            size="large"
            value={<Money value={sumTotalValue} />}
          />
          <Indicator
            name="Gain"
            size="large"
            value={<ColorMoney value={Gain(sumTotalValue, sumTotalCost)} />}
          />
          <Indicator
            name="Return"
            size="large"
            value={<ColorPercent value={Return(sumTotalValue, sumTotalCost)} />}
          />
          <Indicator
            name="Net Cash Flow"
            size="small"
            value={<Money value={sumTotalCost} />}
          />
          <Indicator
            name="Market Gain"
            size="small"
            value={<ColorMoney value={Gain(sumTotalValue, sumTotalCost)} />}
          />
          <Indicator
            name="Earned Staking"
            size="small"
            value={<ColorMoney value={0} />}
          />
        </div>
        <div className="aspect-square self-center rounded-md bg-gray-900 p-2">
          {isLoading ? <LoadingDots /> : <PieChart slices={slices} />}
        </div>
        <div className="col-span-2 rounded-md bg-gray-900 p-2 text-xl font-bold">
          {isLoading ? (
            <LoadingDots />
          ) : (
            <TimeSeriesChart data={timeSeriesData} />
          )}
        </div>
        <div className="col-span-2 sm:col-span-3">
          <h3 className="text-xl font-bold text-white">Slices</h3>
          {isLoading ? (
            <LoadingDots />
          ) : (
            <SliceTable
              nextAlloc={nextAlloc}
              handleUpdate={handleUpdateNextAlloc}
              slices={slices}
            />
          )}
        </div>
        <div className="col-span-2 sm:col-span-3">
          <h3 className="text-xl font-bold text-white">Transactions</h3>
          <TransactionTable values={flatTransactions} />
        </div>
      </div>
    </div>
  );
}
