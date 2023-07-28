import { useRef, useState } from "react";
import { Indicator } from "./indicator";
import { SliceTable, TransactionTable } from "./tables";
import { Money, ColorMoney, ColorPercent } from "./money";
import { PieChart, TimeSeriesChart } from "./charts";
import LoadingDots from "./LoadingDots";
import { useTransactions } from "./useTransactions";
import Coinbase from "../assets/coinbase.favicon.ico";
import Image from "next/image";
import { useCalculate } from "~/hooks/useCalculate";

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

export default function C1() {
  const [nextAlloc, setNextAlloc] = useState(250);
  const { transactions, handleImport } = useTransactions();

  const { assets, sumTotalCost, sumTotalValue, isLoading } =
    useCalculate(transactions);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

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

  const filteredTransactions = transactions.map((e) => {
    return {
      date: e.timeStamp,
      symbol: e.coinId,
      value: e.quantity,
    };
  });

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
          {isLoading ? <LoadingDots /> : <TimeSeriesChart assets={assets} />}
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
          <TransactionTable values={filteredTransactions} />
        </div>
      </div>
    </div>
  );
}
