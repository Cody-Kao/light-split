import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/utils";
import type { TPayment } from "../type/type";
import { ImCancelCircle } from "react-icons/im";
import { colors } from "../const/const";

type SortOptions = "1" | "2" | "3" | "4";

const sortPayments = (
  payments: TPayment[],
  sortOption: SortOptions,
): TPayment[] => {
  return [...payments].sort((a, b) => {
    switch (sortOption) {
      case "1":
        // date descending
        return b.date.localeCompare(a.date);
      case "2":
        // date ascending
        return a.date.localeCompare(b.date);
      case "3": // amount ascending
        return a.amount - b.amount;
      case "4": // amount descending
        return b.amount - a.amount;
      default:
        return 0;
    }
  });
};

//#####################################################
const currency = "台幣(NTD)"; // 尚未處理幣別問題，先寫死
//#####################################################

export default function BarChart({
  userID,
  payments,
  userNameFilter,
  setUserNameFilter,
}: {
  userID: string;
  payments: TPayment[];
  userNameFilter: string;
  setUserNameFilter: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [sortOption, setSortOption] = useState<SortOptions>("1");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const { maxValue, yLabels } = useMemo(() => {
    const maxVal = Math.max(...payments.map((d) => d.amount)) + 1;
    const step = Math.ceil(maxVal / 5 / 100) * 100;
    const top = Math.ceil(maxVal / step) * step;

    const yLabels = [];
    for (let v = 0; v <= top; v += step) {
      yLabels.push(v);
    }

    return { maxValue: top, yLabels };
  }, [payments]);

  const userColors = useMemo(() => {
    const map: Record<string, string> = {};

    payments.forEach((payment, index) => {
      if (!(payment.payerName in map)) {
        // only assign if not in map
        map[payment.payerName] = colors[index % colors.length];
      }
    });

    return map;
  }, []);

  const sortedPayments = sortPayments(payments, sortOption);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chartRef.current &&
        !chartRef.current.contains(event.target as Node)
      ) {
        setActiveIndex(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="flex w-full flex-col">
      <div className="flex h-[300px] w-full rounded-lg bg-[var(--second-white)] p-4 shadow-xl md:h-[400px]">
        {/* Y Axis (now in ascending order, bottom-to-top) */}
        <div className="relative flex h-full w-8 flex-col-reverse items-end justify-between pb-[12px] lg:w-12">
          {yLabels.map((label) => (
            <div
              key={label}
              className="text-xs text-gray-600"
              style={{
                bottom:
                  label === 0
                    ? `calc(${(label / maxValue) * 100}%)`
                    : `${(label / maxValue) * 100}%`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bars (aligned with Y-axis labels) */}
        <div
          ref={chartRef}
          className="ml-2 flex h-full flex-1 items-end gap-4 overflow-x-auto border-l border-gray-300 pl-4"
        >
          {sortedPayments.map((data, i) => (
            <div
              key={i}
              onClick={() => setActiveIndex((prev) => (prev === i ? null : i))}
              className="relative flex min-w-[50px] flex-col items-center md:min-w-[70px]"
              style={{
                height: `calc(${Math.ceil((data.amount / maxValue) * 100)}% + 12px)`, // 補足span吃掉的高度
              }}
            >
              <div
                className={cn(
                  `group relative h-full w-[25px] rounded hover:cursor-pointer hover:border-2 hover:border-amber-300 md:w-[35px]`,
                )}
                style={{ backgroundColor: userColors[data.payerName] }}
              >
                <ToolTip
                  payerName={data.payerID === userID ? "你/妳" : data.payerName}
                  receiverName={
                    data.receiverID === userID ? "你/妳" : data.receiverName
                  }
                  amount={data.amount}
                  className={`${activeIndex === i ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} transition-all duration-200 group-hover:opacity-100`}
                />
              </div>
              <span className="text-[10px] md:text-xs">{data.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex w-full items-center gap-2">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div
            onClick={() => setUserNameFilter("@")}
            key={"@"}
            className={`flex items-center gap-2 p-1 text-[var(--primary-font)] hover:cursor-pointer ${userNameFilter === "@" ? "rounded-lg border-2 border-black dark:border-white" : ""}`}
          >
            <ImCancelCircle className={`h-4 w-4 rounded`} />
            <span>{"顯示全部"}</span>
          </div>
          {Object.entries(userColors).map(([name, color]) => (
            <div
              onClick={() => setUserNameFilter(name)}
              key={name}
              className={`flex items-center gap-2 p-1 text-[var(--primary-font)] hover:cursor-pointer ${userNameFilter === name ? "rounded-lg border-2 border-black dark:border-white" : ""}`}
            >
              <div
                className={`h-4 w-4 rounded`}
                style={{ backgroundColor: color }}
              />
              <span>{name}</span>
            </div>
          ))}
        </div>
        {/* 幣別 */}
        <span className="ml-auto text-[12px] font-bold text-[var(--primary-font)] md:text-[16px]">
          {currency}
        </span>
        {/* 排序 */}
        <select
          className="rounded-lg bg-[var(--second-white)] p-2 text-[12px] shadow-lg outline-none md:text-[16px]"
          name="sort"
          id="sort"
          onChange={(e) => setSortOption(e.target.value as SortOptions)}
        >
          <option value="1">時間(近到遠)</option>
          <option value="2">時間(遠到近)</option>
          <option value="3">金額(小到大)</option>
          <option value="4">金額(大到小)</option>
        </select>
      </div>
    </div>
  );
}

type ToolTipProps = {
  payerName: string;
  receiverName: string;
  amount: number;
  className: string;
};
function ToolTip({ payerName, receiverName, amount, className }: ToolTipProps) {
  return (
    <div
      className={cn(
        "absolute top-[-20px] left-[50%] z-100 flex w-max flex-col flex-wrap items-center justify-center overflow-hidden rounded-lg border-1 border-gray-600 bg-white p-1 text-center",
        className,
      )}
    >
      <span className="text-[12px]">{amount}</span>
      <span className="text-[12px]">{`${payerName} -> ${receiverName}`}</span>
    </div>
  );
}
