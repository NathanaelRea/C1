import { useState } from "react";
import { type Asset, type Slice, type Transaction } from ".";
import { Gain, Return } from "~/lib/utils";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { ColorMoney, ColorPercent, Money } from "./money";
import { z } from "zod";

const metaSchema = z.object({
  allocationHandler: z.function().args(z.number()).returns(z.void()),
});

const sliceColumns: ColumnDef<Slice>[] = [
  {
    header: "Name",
    cell: ({ row }) => <div className="capitalize">{row.original.symbol}</div>,
  },
  {
    header: "Value",
    cell: ({ row }) => <Money value={row.original.gain} />,
  },
  {
    header: "Gain",
    cell: ({ row }) => <ColorMoney value={row.original.gain} />,
  },
  {
    header: "Return",
    cell: ({ row }) => <ColorPercent value={row.original.return} />,
  },
  {
    header: "Actual",
    cell: ({ row }) => <ColorPercent value={row.original.actualPercent} />,
  },
  {
    header: "Target",
    cell: ({ row }) => <ColorPercent value={row.original.targetPercent} />,
  },
  {
    accessorKey: "nextBuy",
    header: ({ table }) => {
      // dumb but works :shrug:
      const parsed = metaSchema.safeParse(table.options.meta);
      return (
        <div className="flex flex-col items-center">
          {table.options.meta != undefined && (
            <>
              <div>Next Buy</div>
              <input
                className="w-1/2 border bg-transparent px-2 text-center focus:border-blue-500"
                placeholder="250"
                onChange={(e) =>
                  parsed.success &&
                  parsed.data.allocationHandler(parseInt(e.target.value))
                }
              />
            </>
          )}
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="flex justify-center">
        {row.original.nextBuy == 0 ? (
          <div>-</div>
        ) : (
          <Money value={row.original.nextBuy} />
        )}
      </div>
    ),
  },
];

export function SliceTable({
  assets,
  sumTotalValue,
}: {
  assets: Asset[];
  sumTotalValue: number;
}) {
  const [allocation, setAllocation] = useState(250);

  const sumAllocation = assets.reduce(
    (acc, val) =>
      acc +
      Math.max(
        0,
        (sumTotalValue + allocation) * val.percentTarget - val.totalValue
      ),
    0
  );

  const slices: Slice[] = assets
    .map((a) => {
      const thisAllocation = Math.max(
        0,
        (sumTotalValue + allocation) * a.percentTarget - a.totalValue
      );
      return {
        symbol: a.symbol,
        totalValue: a.totalValue,
        gain: Gain(a.totalValue, a.totalSpent),
        return: Return(a.totalValue, a.totalSpent),
        targetPercent: a.percentTarget,
        actualPercent: a.totalValue / sumTotalValue,
        nextBuy: (allocation * thisAllocation) / sumAllocation,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  const allocationHandler = (n: number) => setAllocation(isNaN(n) ? 0 : n);

  return (
    <div className="container mx-auto py-10">
      <DataTable
        columns={sliceColumns}
        data={slices}
        meta={{ allocationHandler }}
      />
    </div>
  );
}

const transactionColumns: ColumnDef<Transaction>[] = [
  {
    header: "Name",
    cell: ({ row }) => <div className="capitalize">{row.original.symbol}</div>,
  },
  {
    header: "Date",
    cell: ({ row }) => row.original.date.toLocaleDateString(),
  },
  {
    accessorKey: "value",
    header: "Value",
  },
];

export function TransactionTable({ values }: { values: Transaction[] }) {
  return (
    <div className="container mx-auto py-10">
      <DataTable columns={transactionColumns} data={values} />
    </div>
  );
}
