import * as d3 from "d3";
import { AnimatePresence, motion } from "framer-motion";
import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type RefObject,
} from "react";
import { currency2, percent1 } from "./money";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";
import { type CoinbaseTransaction, type Asset } from ".";
import { addDays } from "date-fns";

interface Data {
  label: string;
  value: number;
}

type TargetPercent = Record<string, number>;

function calculateTimeSeriesData(assetHistory: Asset[]) {
  const maxHistoryLength = assetHistory.reduce(
    (acc, val) => Math.max(acc, val.history.length),
    0
  );
  const timeSeries = [] as CoinbaseTransaction[];
  let timestamp;
  for (let i = 0; i < maxHistoryLength; i += 1) {
    let value = 0;
    timestamp = undefined;
    for (const asset of assetHistory) {
      const ts = asset.history[asset.history.length - i - 1];
      if (!ts) continue;
      value += ts.value;
      timestamp = ts.timestamp;
    }
    if (timestamp) timeSeries.push({ timestamp, value });
  }
  if (timestamp)
    timeSeries.push({
      timestamp: addDays(timestamp, -1),
      value: 0,
    });
  return timeSeries.reverse();
}

export function TimeSeriesChart({ assets }: { assets: Asset[] }) {
  const data = calculateTimeSeriesData(assets);
  const chartRef = useRef<SVGSVGElement>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const { dimensions } = useBoundingRect(chartRef);
  const margin = 10;

  useEffect(() => {
    if (chartRef.current == null || data == undefined) return;

    const chart = d3.select(chartRef.current);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.timestamp) as [Date, Date])
      .range([0, dimensions.width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) ?? 0])
      .range([dimensions.height - margin, margin]);

    const line = d3
      .line<CoinbaseTransaction>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.value));

    chart
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .attr("d", line);

    return () => {
      chart.selectAll("*").remove();
    };
  }, [data, dimensions]);

  const [pointerPosition, setPointerPosition] = useState<
    [number, number] | null
  >([0, 0]);

  // TODO fix
  const xScaleMemo = useMemo(
    () =>
      data == null
        ? null
        : d3
            .scaleTime()
            .domain(d3.extent(data, (d) => d.timestamp) as [Date, Date])
            .range([0, dimensions.width]),
    [data, dimensions]
  );
  const yScaleMemo = useMemo(
    () =>
      data == null
        ? null
        : d3
            .scaleLinear()
            .domain([0, d3.max(data, (d) => d.value) ?? 0])
            .range([dimensions.height - margin, margin]),
    [data, dimensions]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (data == null || xScaleMemo == null) {
        return handlePointerLeave();
      }

      event.preventDefault();
      const relativeX = event.clientX - dimensions.left;
      const relativeY = event.clientY - dimensions.top;

      const bisect = d3.bisector((d: CoinbaseTransaction) => d.timestamp);
      const xValue = xScaleMemo.invert(relativeX);
      const index = bisect.center(data, xValue, 0);

      setHighlighted(index);
      setPointerPosition([relativeX, relativeY]);
    },
    [data, xScaleMemo, dimensions]
  );

  const handlePointerLeave = () => {
    setHighlighted(null);
    setPointerPosition(null);
  };
  const circleDiameter = 10;

  function getRectWidth(
    data: CoinbaseTransaction[] | undefined,
    xScale: d3.ScaleTime<number, number, never> | null
  ) {
    const base = 24;
    if (!data || !xScale) return base;
    const time1 = data[0]?.timestamp;
    const time2 = data[1]?.timestamp;
    if (!time1 || !time2) return base;
    return Math.max(Math.abs(xScale(time1) - xScale(time2)), base);
  }
  const rectWidth = useMemo(
    () => getRectWidth(data, xScaleMemo),
    [data, xScaleMemo]
  );

  const curData =
    data == null || highlighted == null ? null : data[highlighted];

  return (
    <div className="relative h-full w-full touch-none overflow-hidden">
      <svg
        ref={chartRef}
        className="h-full w-full cursor-pointer stroke-black dark:stroke-white"
      />
      <AnimatePresence>
        {data != null && pointerPosition != null && curData != null && (
          <>
            <motion.div
              className="absolute top-0 h-full bg-black dark:bg-white"
              style={{ width: rectWidth }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 0.25,
                left: xScaleMemo
                  ? xScaleMemo(curData.timestamp) - rectWidth / 2
                  : 0,
              }}
              exit={{
                opacity: 0,
                transition: { ease: "easeOut" },
              }}
              transition={{
                duration: 0,
              }}
            />
            <motion.div
              className="absolute z-10 rounded-full bg-black dark:bg-white"
              style={{ width: circleDiameter, height: circleDiameter }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                left: xScaleMemo
                  ? xScaleMemo(curData.timestamp) - circleDiameter / 2
                  : 0,
                top: yScaleMemo
                  ? yScaleMemo(curData.value) - circleDiameter / 2
                  : 0,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{ duration: 0 }}
            />
            <motion.div
              className="absolute left-0 top-0"
              initial={{ opacity: 0, y: "-100%" }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: "-100%",
                transition: { ease: "easeIn" },
              }}
              transition={{ ease: "easeOut" }}
            >
              <p>{curData.timestamp.toLocaleDateString()}</p>
              <p>{currency2.format(curData.value)}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <div
        className="absolute left-0 top-0 h-full w-full"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />
    </div>
  );
}

export function PieChart({
  assets,
  sumTotalValue,
}: {
  assets: Asset[];
  sumTotalValue: number;
}) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const { dimensions } = useBoundingRect(chartRef);

  const maxDiameter = Math.min(dimensions.height, dimensions.width);
  const innerRadius = maxDiameter / 3.5;
  const minRadius = maxDiameter / 3;
  const maxRadius = maxDiameter / 2;
  const radiusDelta = maxRadius - minRadius;

  const pieData = assets
    .map((a) => {
      return {
        label: a.symbol,
        value: a.totalValue / sumTotalValue,
      };
    })
    .sort((a, b) => b.value - a.value);

  const targetPercent = assets.reduce((acc: TargetPercent, val) => {
    acc[val.symbol] = val.percentTarget;
    return acc;
  }, {} as Record<string, number>);

  const handlePointerEnter = useCallback(
    function (_: PointerEvent, d: d3.PieArcDatum<Data>) {
      setHighlighted(d.index);
    },
    [setHighlighted]
  );

  const handlePointerLeave = useCallback(
    function () {
      setHighlighted(null);
    },
    [setHighlighted]
  );

  function calculateWeight(target: number, actual: number) {
    if (actual == 0) return 0;
    const weight = (actual - target) / actual;
    return (Math.min(Math.max(weight, -1), 1) + 1) / 2;
  }

  useEffect(() => {
    if (chartRef.current == null || pieData == undefined) return;

    const svg = d3.select(chartRef.current);

    const pie = d3
      .pie<Data>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<Data>>()
      .innerRadius(innerRadius)
      .outerRadius(
        (d) =>
          minRadius +
          radiusDelta *
            calculateWeight(targetPercent[d.data.label] ?? 0, d.data.value)
      );

    const color = d3.scaleOrdinal<string, string>(d3.schemeDark2);
    const getHighlightedColor = (d: d3.PieArcDatum<Data>, index: number) => {
      const hslColor = d3.hsl(color(d.data.label));
      return highlighted === index
        ? hslColor.brighter(0.5).toString()
        : hslColor.toString();
    };

    const chart = svg
      .append("g")
      .attr(
        "transform",
        `translate(${dimensions.width / 2}, ${dimensions.height / 2})`
      )
      .style("cursor", "pointer");

    const paths = chart
      .selectAll("path")
      .data(pie(pieData))
      .enter()
      .append("path");

    paths
      .attr("d", arc)
      .attr("fill", (d, i) => getHighlightedColor(d, i))
      .on("pointerenter", handlePointerEnter)
      .on("pointerleave", handlePointerLeave);

    return () => {
      svg.selectAll("*").remove();
    };
  }, [
    pieData,
    highlighted,
    dimensions,
    handlePointerLeave,
    handlePointerEnter,
    innerRadius,
    minRadius,
    radiusDelta,
    targetPercent,
  ]);

  const curData = highlighted == null ? null : pieData[highlighted];
  const target = curData?.label ? targetPercent[curData?.label] ?? 0 : 0;

  return (
    <div className="relative h-full w-full touch-none">
      <svg ref={chartRef} className="h-full w-full" />
      {curData != null && (
        <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="capitalize">{curData.label}</div>
            <div className="flex items-center gap-1">
              {curData.value > target ? (
                <ArrowsPointingInIcon className="h-3" />
              ) : (
                <ArrowsPointingOutIcon className="h-3" />
              )}
              <div>{percent1.format(curData.value)}</div>
            </div>
            <div>{percent1.format(target)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function useBoundingRect(chartRef: RefObject<SVGSVGElement>) {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });

  useEffect(() => {
    function handleResize() {
      if (!chartRef) return;
      const chart = d3.select(chartRef.current);
      const boundingRect = chart.node()?.getBoundingClientRect();
      setDimensions({
        width: boundingRect?.width ?? 0,
        height: boundingRect?.height ?? 0,
        left: boundingRect?.left ?? 0,
        top: boundingRect?.top ?? 0,
      });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [chartRef]);

  return { dimensions };
}
