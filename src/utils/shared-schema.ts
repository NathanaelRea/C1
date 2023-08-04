import axios from "axios";
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
