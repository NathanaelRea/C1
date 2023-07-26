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
import { ArrowsPointingInIcon } from "@heroicons/react/24/solid";
import { type Slice, type CoinbaseTransaction } from ".";

interface Data {
  label: string;
  value: number;
}

type TargetPercent = Record<string, number>;

export function TimeSeriesChart({
  data,
}: {
  data: CoinbaseTransaction[] | undefined;
}) {
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
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("d", line);

    return () => {
      chart.selectAll("*").remove();
    };
  }, [data, dimensions]);

  const [mousePosition, setMousePosition] = useState<[number, number] | null>([
    0, 0,
  ]);

  // TODO fix
  const xScaleasdfasdf = useMemo(
    () =>
      data == null
        ? null
        : d3
            .scaleTime()
            .domain(d3.extent(data, (d) => d.timestamp) as [Date, Date])
            .range([0, dimensions.width]),
    [data, dimensions]
  );
  const yScaleasdfasdf = useMemo(
    () =>
      data == null
        ? null
        : d3
            .scaleLinear()
            .domain([0, d3.max(data, (d) => d.value) ?? 0])
            .range([dimensions.height - margin, margin]),
    [data, dimensions]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (data == null || xScaleasdfasdf == null) {
        setHighlighted(null);
        setMousePosition(null);
        return;
      }

      const bisect = d3.bisector((d: CoinbaseTransaction) => d.timestamp);
      const { offsetX: mouseX, offsetY: mouseY } = event.nativeEvent;
      const xValue = xScaleasdfasdf.invert(mouseX);
      const index = bisect.left(data, xValue, 0);

      setHighlighted(index);
      setMousePosition([mouseX, mouseY]);
    },
    [data, xScaleasdfasdf]
  );

  const handleMouseLeave = () => {
    setHighlighted(null);
    setMousePosition(null);
  };
  const circleDiameter = 10;
  const rectWidth = 24;

  const curData =
    data == null || highlighted == null ? null : data[highlighted];

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg ref={chartRef} className="h-full w-full" />
      <AnimatePresence>
        {data != null && mousePosition != null && curData != null && (
          <>
            <motion.div
              className={`pointer-events-none absolute top-0 h-full bg-white`}
              style={{ width: rectWidth }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 0.25,
                left: xScaleasdfasdf
                  ? xScaleasdfasdf(curData.timestamp) - rectWidth / 2
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
              className={`pointer-events-none absolute z-10 rounded-full bg-white`}
              style={{ width: circleDiameter, height: circleDiameter }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                left: xScaleasdfasdf
                  ? xScaleasdfasdf(curData.timestamp) - circleDiameter / 2
                  : 0,
                top: yScaleasdfasdf
                  ? yScaleasdfasdf(curData.value) - circleDiameter / 2
                  : 0,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{ duration: 0 }}
            />
            <motion.div
              className="pointer-events-none absolute left-0 top-0"
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
              <p className="text-white">
                {curData.timestamp.toLocaleDateString()}
              </p>
              <p className="text-white">{currency2.format(curData.value)}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <div
        className="absolute left-0 top-0 h-full w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}

export function PieChart({ slices }: { slices: Slice[] }) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const { dimensions } = useBoundingRect(chartRef);

  const maxDiameter = Math.min(dimensions.height, dimensions.width);
  const innerRadius = maxDiameter / 3.5;
  const minRadius = maxDiameter / 3;
  const maxRadius = maxDiameter / 2;
  const radiusDelta = maxRadius - minRadius;

  const data = slices.map((s) => {
    return {
      label: s.symbol,
      value: s.actualPercent,
    };
  });
  const targetPercent = slices.reduce((acc: TargetPercent, val) => {
    acc[val.symbol] = val.targetPercent;
    return acc;
  }, {} as Record<string, number>);

  const handleMouseOver = useCallback(
    function (_: MouseEvent, d: d3.PieArcDatum<Data>) {
      setHighlighted(d.index);
    },
    [setHighlighted]
  );

  const handleMouseOut = useCallback(
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
    if (chartRef.current == null || data == undefined) return;

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
      );

    const paths = chart
      .selectAll("path")
      .data(pie(data))
      .enter()
      .append("path");

    paths
      .attr("d", arc)
      .attr("fill", (d, i) => getHighlightedColor(d, i))
      .on("mouseenter", handleMouseOver)
      .on("mouseleave", handleMouseOut);

    return () => {
      svg.selectAll("*").remove();
    };
  }, [
    data,
    highlighted,
    dimensions,
    handleMouseOut,
    handleMouseOver,
    innerRadius,
    minRadius,
    radiusDelta,
    targetPercent,
  ]);

  const curData = highlighted == null ? null : data[highlighted];

  return (
    <div className="relative h-full w-full">
      <svg ref={chartRef} className="h-full w-full" />
      {curData != null && (
        <div
          className={`pointer-events-none absolute left-0 top-0 flex h-full w-full items-center justify-center`}
        >
          <div className="text-center">
            <div className="text-white">{curData.label}</div>
            <div className="text-white">{percent1.format(curData.value)}</div>
            <div className="flex items-center">
              <ArrowsPointingInIcon className="h-3 text-white" />
              <div className="text-white">
                {percent1.format(targetPercent[curData.label] ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useBoundingRect(chartRef: RefObject<SVGSVGElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const chart = d3.select(chartRef.current);
    const handleResize = () => {
      setDimensions({
        width: chart.node()?.getBoundingClientRect().width ?? 0,
        height: chart.node()?.getBoundingClientRect().height ?? 0,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [chartRef]);

  return { dimensions };
}
