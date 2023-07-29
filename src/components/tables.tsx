import { useState } from "react";
import { type Asset, type Slice, type Transaction } from ".";
import { Gain, Return } from "~/lib/utils";
import {
  type ColumnDef,
  type SortDirection,
  type Column,
} from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { ColorMoney, ColorPercent, Money } from "./money";
import { z } from "zod";
import { Button } from "./ui/button";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/solid";

const metaSchema = z.object({
  allocationHandler: z.function().args(z.number()).returns(z.void()),
});

const sliceColumns: ColumnDef<Slice>[] = [
  {
    accessorKey: "symbol",
    cell: ({ row }) => <div className="capitalize">{row.original.symbol}</div>,
    header: ({ column }) => <SortHeader column={column} name="Name" />,
  },
  {
    accessorKey: "totalValue",
    cell: ({ row }) => <Money value={row.original.totalValue} />,
    header: ({ column }) => <SortHeader column={column} name="Value" />,
  },
  {
    accessorKey: "gain",
    cell: ({ row }) => <ColorMoney value={row.original.gain} />,
    header: ({ column }) => <SortHeader column={column} name="Gain" />,
  },
  {
    accessorKey: "return",
    cell: ({ row }) => <ColorPercent value={row.original.return} />,
    header: ({ column }) => <SortHeader column={column} name="Return" />,
  },
  {
    accessorKey: "actualPercent",
    cell: ({ row }) => <ColorPercent value={row.original.actualPercent} />,
    header: ({ column }) => <SortHeader column={column} name="Actual" />,
  },
  {
    accessorKey: "targetPercent",
    cell: ({ row }) => <ColorPercent value={row.original.targetPercent} />,
    header: ({ column }) => <SortHeader column={column} name="Target" />,
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
                className="w-16 border bg-transparent text-center focus:border-blue-500"
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
    accessorKey: "symbol",
    cell: ({ row }) => <div className="capitalize">{row.original.symbol}</div>,
    header: ({ column }) => <SortHeader column={column} name="Name" />,
  },
  {
    accessorKey: "value",
    header: "Value",
  },
  {
    accessorKey: "date",
    cell: ({ row }) => row.original.date.toLocaleDateString(),
    header: ({ column }) => <SortHeader column={column} name="Date" />,
  },
];

function SortHeader<T>({ column, name }: { column: Column<T>; name: string }) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting()}
      className="flex gap-2"
    >
      {name}
      <SortArrows sort={column.getIsSorted()} />
    </Button>
  );
}

function SortArrows({ sort }: { sort: false | SortDirection }) {
  if (!sort) return <ArrowsUpDownIcon className="h-4 w-4" />;
  else if (sort == "asc") return <ArrowDownIcon className="h-4 w-4" />;
  else return <ArrowUpIcon className="h-4 w-4" />;
}

export function TransactionTable({ values }: { values: Transaction[] }) {
  return (
    <div className="container mx-auto py-10">
      <DataTable columns={transactionColumns} data={values} />
    </div>
  );
}
