import { z } from "zod";

const dateNumberSchema = z.array(
  z.tuple([z.number().transform((v) => new Date(v)), z.number()])
);
const dateNulllableNumberSchema = z.array(
  z.tuple([z.number().transform((v) => new Date(v)), z.number().nullable()])
);
export const marketChartSchema = z.object({
  prices: dateNumberSchema,
  market_caps: dateNulllableNumberSchema, // No clue why only this nullable?
  total_volumes: dateNumberSchema,
});
export type MarketChart = z.infer<typeof marketChartSchema>;
export const coinListSchema = z.array(
  z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
  })
);
export type CoinList = z.infer<typeof coinListSchema>;

const coinbaseTransactionType = z.enum([
  "Buy",
  "Sell",
  "Send",
  "Convert",
  "Receive",
  "Rewards Income",
  "Advanced Trade Buy",
  "Advanced Trade Sell",
]);
export const coinbaseSchema = z.object({
  timeStamp: z.coerce.date(),
  transactionType: coinbaseTransactionType,
  asset: z.string(),
  quantityTransacted: z.coerce.number(),
  spotPriceCurrency: z.string(),
  spotPriceAtTransaction: z.coerce.number(),
  subtotal: z.coerce.number(),
  total: z.coerce.number(),
  feesPlusSpread: z.coerce.number(),
  notes: z.string(),
});
export type CoinbaseTransactionType = z.infer<typeof coinbaseTransactionType>;

export const storageTransactionType = z.enum([
  "Buy",
  "Sell",
  "Send",
  "Receive",
  "Stake",
  "Other",
]);
export const storageTransaction = z.object({
  timeStamp: z.coerce.date(),
  type: storageTransactionType,
  coinId: z.string(),
  quantity: z.number(),
  totalPrice: z.number(),
});
export type StorageTransactionType = z.infer<typeof storageTransactionType>;
export type StorageTransaction = z.infer<typeof storageTransaction>;

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

const baseSliceData = z.object({
  symbol: z.string(),
  totalValue: z.number(),
  totalSpent: z.number(),
  percentTarget: z.number(),
});
export type BaseSliceData = z.infer<typeof baseSliceData>;
