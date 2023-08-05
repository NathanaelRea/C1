import {
  type CoinbaseTransactionType,
  type StorageTransaction,
  type StorageTransactionType,
  coinbaseSchema,
} from "~/utils/shared-schema";

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

function symbolTransform(symbol: string): string {
  // Coinbase is silly
  return symbol === "ETH2" ? "ETH" : symbol;
}

export const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    return data; // TODO fix can't just return here
  };
  reader.readAsText(file);
};
