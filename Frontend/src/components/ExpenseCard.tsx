import type { ComponentProps } from "react";
import type { TExpenseCard } from "../type/type";
import { useLoginContext } from "../context/LoginContextProvider";

type ExpenseCardProps = {
  expense: TExpenseCard;
} & ComponentProps<"div">;

export default function ExpenseCard({ expense, ...props }: ExpenseCardProps) {
  const { user } = useLoginContext();
  return (
    <div
      key={expense.id}
      className="group relative flex h-[120px] flex-col justify-between overflow-hidden rounded-xl bg-[var(--second-white)] px-4 py-2 shadow-xl hover:cursor-pointer"
      {...props}
    >
      <div className="absolute bottom-0 left-0 block h-[10px] w-full bg-[var(--second-gray)] transition-all duration-200 group-hover:block sm:hidden dark:bg-gray-400"></div>
      <div className="flex items-center justify-between">
        <p title={expense.name} className="w-[250px] truncate font-bold">
          {expense.name}
        </p>
        <span className="text-sm font-light">{expense.editedAt}</span>
      </div>
      <div className="flex items-center justify-end">
        <p title={expense.name} className="w-[250px] truncate text-end text-sm">
          建立者:&nbsp;
          {expense.creatorID === user?.id ? "你" : expense.creatorName}
        </p>
      </div>
    </div>
  );
}
