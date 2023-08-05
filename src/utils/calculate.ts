import axios from "axios";
import {
  type CoinList,
  type MarketChart,
  coinListSchema,
  marketChartSchema,
} from "./shared-schema";

export const getCoinList = async (): Promise<CoinList> => {
  const res = await axios.get("https://api.coingecko.com/api/v3/coins/list");
  const parsed = coinListSchema.safeParse(res.data);
  if (!parsed.success) {
    return [];
  }
  return parsed.data;
};

export const getMarketHistory = async (
  coinId: string
): Promise<MarketChart> => {
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=max`
  );
  const parsed = marketChartSchema.safeParse(res.data);
  if (!parsed.success) {
    return { prices: [], market_caps: [], total_volumes: [] };
  }
  return parsed.data;
};
