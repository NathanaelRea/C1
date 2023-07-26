import { type Slice, type Transaction } from ".";
import { ColorMoney, ColorPercent, Money } from "./money";

export function SliceTable({
  nextAlloc,
  handleUpdate,
  slices,
}: {
  nextAlloc: number;
  handleUpdate: (e: React.ChangeEvent<HTMLInputElement>) => void;
  slices: Slice[];
}) {
  return (
    <div className="overflow-clip rounded-md">
      <div className="grid grid-cols-5 items-center justify-items-center bg-cyan-900 p-2 text-cyan-300">
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
            className="bg-inherit text-center outline-none"
            value={nextAlloc}
            placeholder="250"
            onChange={handleUpdate}
          />
        </div>
      </div>
      {slices.map((slice) => (
        <div
          className="grid grid-cols-5 items-center justify-items-center bg-cyan-950 p-1 text-cyan-100"
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
      <div className="grid grid-cols-3 items-center justify-items-center rounded-t-md bg-cyan-900 p-2 text-cyan-300">
        <div>Name</div>
        <div>Date</div>
        <div>Value</div>
      </div>
      {values.map((t) => (
        <div
          key={`${t.symbol}-${t.date.toLocaleDateString()}-${t.value}`}
          className="grid grid-cols-3 items-center justify-items-center bg-cyan-950 p-1 text-cyan-100"
        >
          <div>{t.symbol}</div>
          <div>{t.date.toDateString()}</div>
          <div>{t.value}</div>
        </div>
      ))}
    </div>
  );
}
