import { type ReactNode } from "react";

export function Indicator({
  name,
  size,
  value,
}: {
  name: string;
  size: "small" | "medium" | "large";
  value: ReactNode;
}) {
  switch (size) {
    case "small":
      return (
        <div>
          <div className="text-xs">{name}</div>
          <div className="text-lg">{value}</div>
        </div>
      );
    case "medium":
      return (
        <div>
          <div className="text-xs">{name}</div>
          <div className="text-2xl">{value}</div>
        </div>
      );
    case "large":
      return (
        <div>
          <div className="text-xs">{name}</div>
          <div className="text-4xl">{value}</div>
        </div>
      );
  }
}
