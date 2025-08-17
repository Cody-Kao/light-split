import { useNavigate, useParams } from "react-router";
import FunctionButton from "../FunctionButton";
import PreviousPageArrow from "../PreviousPageArrow";
import BarChart from "../BarChart";
import { useMemo, useState } from "react";
import { LuRefreshCcw } from "react-icons/lu";
import type {
  AggregatedPayment,
  TPayment,
  TSettlementDataResponse,
} from "../../type/type";
import NotFound from "./NotFound";
import DoughnutChart from "../DoughnutChart";
import Spinner from "../Spinner";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useSettleGroup } from "../../Hooks/hooks";
import ConfirmModal from "../Modal/ConfirmModal";
import type { SettleGroupRequest } from "../../type/request";
import { showToast } from "../../utils/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function Settlement({
  settlement,
  refetchFunction,
  isFetching,
}: {
  settlement: TSettlementDataResponse;
  refetchFunction: () => void;
  isFetching: boolean;
}) {
  const { user } = useLoginContext();
  const navigate = useNavigate();
  const params = useParams();
  const groupID = params["groupID"];
  const [showAggregatedPayments, setShowAggregatedPayments] = useState(false);
  const [userNameFilter, setUserNameFilter] = useState("@");
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { mutate, isPending } = useSettleGroup();
  const handleSettleGroup = () => {
    if (!user || !groupID || settlement.isGroupSettled) return;
    const data: SettleGroupRequest = {
      userID: user.id,
      groupID: groupID,
    };
    mutate(data, {
      onSuccess: (response) => {
        if (response.type === "Error") {
          showToast(`核銷群組失敗: ${response.payload.message}`);
          return;
        }
        showToast("核銷群組成功", true);
        queryClient.invalidateQueries({ queryKey: ["useSettlement", groupID] });
      },
    });
  };

  let payments = [...settlement.payments];
  const aggregatedPayments = useMemo(() => {
    const map = new Map<string, number>();
    for (const { payerName, receiverName, amount } of payments) {
      const key = `${payerName}->${receiverName}`;
      const reverseKey = `${receiverName}->${payerName}`;

      if (map.has(reverseKey)) {
        const reverseAmount = map.get(reverseKey)!;
        if (reverseAmount > amount) {
          map.set(reverseKey, reverseAmount - amount);
        } else if (reverseAmount < amount) {
          map.delete(reverseKey);
          map.set(key, amount - reverseAmount);
        } else {
          map.delete(reverseKey); // amounts cancel out
        }
      } else {
        map.set(key, (map.get(key) || 0) + amount);
      }
    }

    // Convert back into array of payments
    const result: AggregatedPayment[] = [];
    for (const [key, amount] of map.entries()) {
      const [payerName, receiverName] = key.split("->");
      result.push({
        payerName,
        receiverName,
        amount,
      });
    }

    return result;
  }, [settlement]);

  // filter payment
  if (userNameFilter !== "@") {
    payments = payments.filter(
      (payment) => payment.payerName === userNameFilter,
    );
  }
  if (!groupID || !user) return <NotFound />;
  return (
    <div className="relative flex w-full flex-col gap-4 px-4 py-4">
      <ConfirmModal
        isOpen={showConfirm}
        content={"確定要核銷該群組嗎?\n此操作會使群組變成唯讀且不可逆"}
        closeModal={() => setShowConfirm(false)}
        callback={handleSettleGroup}
        className="w-max max-w-[300px]"
      />
      <header className="flex w-full items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <PreviousPageArrow
            onClick={() => navigate(`/home/group/${groupID}`)}
          />
          <span className="w-[200px] truncate text-xl text-[var(--primary-font)]">
            {settlement.groupName}
          </span>
        </div>
        {user.id === settlement.groupCreatorID && (
          <FunctionButton
            disabled={settlement.isGroupSettled || isPending}
            onClick={() => setShowConfirm(true)}
            className={`${payments.length > 0 && !settlement.isGroupSettled ? (isPending ? "pointer-events-none" : "") : "pointer-events-none text-gray-400"} ml-auto h-[40px] w-[85px] hover:bg-blue-500 hover:text-white`}
          >
            {settlement.isGroupSettled ? (
              "已核銷"
            ) : isPending ? (
              <Spinner size={24} />
            ) : (
              "核銷"
            )}
          </FunctionButton>
        )}
      </header>
      {/* bar chart */}
      {payments.length > 0 ? (
        <BarChart
          userID={user.id}
          payments={payments}
          userNameFilter={userNameFilter}
          setUserNameFilter={setUserNameFilter}
        />
      ) : (
        <span className="text-xl font-bold text-[var(--primary-font)]">
          目前尚無花費...
        </span>
      )}

      {payments.length > 0 && (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {/* doughnut chart */}
          <div className="flex w-full flex-col items-center justify-center rounded-lg bg-gray-200 py-4 lg:order-2 dark:bg-gray-100">
            <DoughnutChart payments={aggregatedPayments} />
          </div>
          {/* 細項與總結 */}
          <div className="flex w-full flex-col gap-1 rounded-lg bg-[var(--second-white)] p-4 lg:order-1">
            {/* header */}
            <header className="flex w-full items-center gap-2">
              <button
                onClick={() => setShowAggregatedPayments(false)}
                className={`${!showAggregatedPayments ? "border-blue-500 text-blue-500" : "border-gray-200 text-gray-500 dark:border-white"} flex w-full items-center justify-center border-b-3 py-2 font-bold hover:cursor-pointer`}
              >
                細項
              </button>
              <button
                onClick={() => setShowAggregatedPayments(true)}
                className={`${showAggregatedPayments ? "border-blue-500 text-blue-500" : "border-gray-200 text-gray-500 dark:border-white"} flex w-full items-center justify-center border-b-3 py-2 font-bold hover:cursor-pointer`}
              >
                總結
              </button>
            </header>
            <div className="flex w-full justify-end">
              <button
                onClick={refetchFunction}
                disabled={isFetching}
                className={`${isFetching ? "pointer-events-none text-gray-300" : ""} flex items-center text-[var(--third-blue)] underline hover:cursor-pointer hover:text-blue-500`}
              >
                {isFetching ? (
                  <Spinner size={18} />
                ) : (
                  <>
                    <LuRefreshCcw size={16} /> <span>刷新</span>
                  </>
                )}
              </button>
            </div>
            {showAggregatedPayments ? (
              <Payments
                payments={aggregatedPayments}
                showAggregatedPayments={true}
                groupID={groupID}
              />
            ) : (
              <Payments
                payments={payments}
                showAggregatedPayments={false}
                groupID={groupID}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// type overloads
type PaymentProps =
  | {
      payments: TPayment[];
      showAggregatedPayments: false;
      groupID: string;
    }
  | {
      payments: AggregatedPayment[];
      showAggregatedPayments: true;
      groupID: string;
    };

function Payments({ payments, showAggregatedPayments, groupID }: PaymentProps) {
  const navigate = useNavigate();
  if (!showAggregatedPayments) {
    // payments is correctly inferred as Payment[]
    payments.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  return (
    <div className="flex h-[400px] w-full flex-col gap-4 overflow-auto pt-2 pb-4">
      {payments.map((payment, i) => (
        <div
          key={i}
          onClick={() => {
            if (!showAggregatedPayments) {
              const p = payment as TPayment;
              return navigate(`/home/group/${groupID}/expense/${p.expenseID}`);
            } else {
              return undefined;
            }
          }}
          className={`group relative flex min-h-[60px] w-full items-center overflow-hidden rounded-lg bg-gray-100 px-4 shadow-lg ${!showAggregatedPayments ? "hover:cursor-pointer" : ""}`}
        >
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center">
              <span className="font-bold">{payment.payerName}</span>&nbsp;
              {!showAggregatedPayments ? "應付" : "總需付"}&nbsp;
              <span className="font-bold">{payment.receiverName}</span>
            </div>
            {!showAggregatedPayments && (
              <span className="text-left text-[14px] text-gray-500">
                {(payment as TPayment).expenseName}
              </span>
            )}
          </div>

          <span className="ml-auto font-bold text-red-500">
            {payment.amount}
          </span>
          <div className="absolute bottom-0 left-0 h-[10px] w-full bg-gray-400/60 opacity-0 transition-all duration-500 group-hover:opacity-100"></div>
        </div>
      ))}
    </div>
  );
}
