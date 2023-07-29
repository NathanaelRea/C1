import { addWeeks } from "date-fns";
import { useState } from "react";
import { z } from "zod";

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
const coinbaseSchema = z.object({
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
type CoinbaseTransactionType = z.infer<typeof coinbaseTransactionType>;

const storageTransactionType = z.enum([
  "Buy",
  "Sell",
  "Send",
  "Receive",
  "Stake",
  "Other",
]);
const storageTransaction = z.object({
  timeStamp: z.coerce.date(),
  type: storageTransactionType,
  coinId: z.string(),
  quantity: z.number(),
  totalPrice: z.number(),
});
type StorageTransactionType = z.infer<typeof storageTransactionType>;
export type StorageTransaction = z.infer<typeof storageTransaction>;

function typeTransform(
  coinbaseType: CoinbaseTransactionType
): StorageTransactionType {
  switch (coinbaseType) {
    case "Buy":
    case "Sell":
    case "Send":
    case "Receive":
      return coinbaseType;
    case "Advanced Trade Buy":
      return "Buy";
    case "Advanced Trade Sell":
      return "Sell";
    case "Rewards Income":
      return "Stake";
    default:
      return "Other";
  }
}

const TRANSACTIONS = "transactions";

export function useTransactions() {
  const localStorage =
    typeof window !== "undefined"
      ? window.localStorage.getItem(TRANSACTIONS) ?? "[]"
      : "[]";
  const p = z.array(storageTransaction).safeParse(JSON.parse(localStorage));
  const [transactions, setTransactions] = useState<StorageTransaction[]>(
    p.success && p.data.length > 0 ? p.data : createDefaultData()
  );

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file == null) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = [] as StorageTransaction[];
      text.split("\n").forEach((row) => {
        const splitRow = row.split(",");
        const coinbaseParsed = coinbaseSchema.safeParse({
          timeStamp: splitRow[0],
          transactionType: splitRow[1],
          asset: splitRow[2],
          quantityTransacted: splitRow[3],
          spotPriceCurrency: splitRow[4],
          spotPriceAtTransaction: splitRow[5],
          subtotal: splitRow[6],
          total: splitRow[7],
          feesPlusSpread: splitRow[8],
          notes: splitRow[9],
        });
        if (coinbaseParsed.success) {
          data.push({
            timeStamp: coinbaseParsed.data.timeStamp,
            type: typeTransform(coinbaseParsed.data.transactionType),
            coinId: symbolTransform(coinbaseParsed.data.asset),
            quantity: coinbaseParsed.data.quantityTransacted,
            totalPrice: coinbaseParsed.data.subtotal,
          });
        }
      });
      window?.localStorage.setItem(TRANSACTIONS, JSON.stringify(data));
      setTransactions(data);
    };
    reader.readAsText(file);
  };

  return { transactions, handleImport };
}

function symbolTransform(symbol: string): string {
  // Coinbase is silly
  return symbol === "ETH2" ? "ETH" : symbol;
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
