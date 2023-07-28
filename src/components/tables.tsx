import { useState } from "react";
import { type Asset, type Slice, type Transaction } from ".";
import { ColorMoney, ColorPercent, Money } from "./money";
import { Gain, Return } from "~/lib/util";

export function SliceTable({
  assets,
  sumTotalValue,
}: {
  assets: Asset[];
  sumTotalValue: number;
}) {
  const [nextAlloc, setNextAlloc] = useState(250);

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

  const handleUpdate = (e: React.ChangeEvent<HTMLInputElement>) =>
    setNextAlloc(
      isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value)
    );

  return (
    <div className="overflow-clip rounded-md">
      <div className="grid grid-cols-5 items-center justify-items-center bg-fuchsia-900 p-2 text-white">
        <div>Name</div>
        <div>Value</div>
        <div className="flex flex-col items-center">
          <div>Gain</div>
          <div>Return</div>
        </div>
        <div className="flex flex-col items-center">
          <div>Actual</div>
          <div>Target</div>
        </div>
        <div className="flex flex-col items-center">
          <div>Next Buy</div>
          <input
            className="w-3/4 border bg-transparent px-2 text-center focus:border-blue-500"
            value={nextAlloc}
            placeholder="250"
            onChange={handleUpdate}
          />
        </div>
      </div>
      {slices.map((slice) => (
        <div
          className="grid grid-cols-5 items-center justify-items-center bg-gray-900 p-1 text-white"
          key={slice.symbol}
        >
          <div>{slice.symbol}</div>
          <ColorMoney value={slice.totalValue} />
          <div className="flex flex-col items-end">
            <ColorMoney value={slice.gain} />
            <ColorPercent value={slice.return} />
          </div>
          <div className="flex flex-col items-end">
            <ColorPercent value={slice.actualPercent} />
            <ColorPercent value={slice.targetPercent} />
          </div>
          {slice.nextBuy == 0 ? <div>-</div> : <Money value={slice.nextBuy} />}
        </div>
      ))}
    </div>
  );
}

export function TransactionTable({ values }: { values: Transaction[] }) {
  return (
    <div className="overflow-clip rounded-md">
      <div className="grid grid-cols-3 items-center justify-items-center rounded-t-md bg-fuchsia-900 p-2 text-white">
        <div>Name</div>
        <div>Date</div>
        <div>Value</div>
      </div>
      {values.map((t) => (
        <div
          key={`${t.symbol}-${t.date.toLocaleDateString()}-${t.value}`}
          className="grid grid-cols-3 items-center justify-items-center bg-gray-900 p-1 text-white"
        >
          <div>{t.symbol}</div>
          <div>{t.date.toLocaleDateString()}</div>
          <div>{t.value}</div>
        </div>
      ))}
    </div>
  );
}
