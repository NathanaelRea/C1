export const percent0 = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
export const percent1 = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export const percent2 = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const currency0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
export const currency2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function Money({ value }: { value: number }) {
  return <div className="text-white">{currency0.format(value)}</div>;
}

export function ColorMoney({ value }: { value: number }) {
  if (value > 0)
    return <div className="text-green-500">{currency0.format(value)}</div>;
  else if (value < 0)
    return <div className="text-red-500">{currency0.format(value)}</div>;
  else return <div className="text-white">{currency0.format(value)}</div>;
}

export function ColorPercent({ value }: { value: number }) {
  if (value > 0)
    return <div className="text-green-500">{percent1.format(value)}</div>;
  else if (value < 0)
    return <div className="text-red-500">{percent1.format(value)}</div>;
  else return <div className="text-white">{percent1.format(value)}</div>;
}
