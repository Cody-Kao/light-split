import { useNavigate } from "react-router";
import ExpenseCard from "../ExpenseCard";
import SearchBar from "../SearchBar";
import FunctionButton from "../FunctionButton";
import PreviousPageArrow from "../PreviousPageArrow";
import { useState } from "react";
import MemberModal from "../Modal/MemberModal";
import type { TExpenseCard, TGroup } from "../../type/type";
import { useDeleteGroup, usePaginatedExpenses } from "../../Hooks/hooks";
import { ExpenseCardResponseSchema } from "../../Schema/schema";
import Spinner from "../Spinner";
import Skeleton from "../Skeleton";
import { useLoginContext } from "../../context/LoginContextProvider";
import { showToast, useDebounce } from "../../utils/utils";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmModal from "../Modal/ConfirmModal";
export default function GroupPage({ group }: { group: TGroup }) {
  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetching,
    isPending: isExpensePending,
  } = usePaginatedExpenses(group.id, ExpenseCardResponseSchema);
  const { user } = useLoginContext();
  const [filter, setFilter] = useState("");
  const [debouncedSetFilter, directSetFilter] = useDebounce(setFilter, 1000);
  const { mutate, isPending } = useDeleteGroup();
  const queryClient = useQueryClient();
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const handleDeleteGroup = () => {
    if (!user) return;
    mutate(
      { userID: user.id, groupID: group.id },
      {
        onSuccess: (res) => {
          if (res.type === "Logout") {
            logoutUser();
            navigate("/home/login");
          }
          if (res.type === "Error") {
            showToast(`刪除群組失敗: ${res.payload.message}`);
            return;
          }
          showToast("刪除成功！", true);
          queryClient.invalidateQueries({ queryKey: ["paginatedGroups"] });
          queryClient.invalidateQueries({ queryKey: ["initialize groups"] });
          navigate("/home");
        },
      },
    );
  };
  const navigate = useNavigate();
  const { logoutUser } = useLoginContext();
  const [openMemberModal, setOpenMemberModal] = useState(false);
  if (!data || isExpensePending) return <Skeleton />;

  let expenses = data.pages.flatMap((page) => {
    if (page.type === "Error") {
      throw Error(page.payload.message);
    } else if (page.type === "Logout") {
      logoutUser();
      navigate("/home/login");
    }
    return page.payload.data.expenseCards as TExpenseCard;
  });
  const haveExpense = expenses.length > 0;
  if (filter) {
    expenses = expenses.filter((expense) => expense.name.startsWith(filter));
  }
  if (!user) {
    navigate("/home/login");
  }
  return (
    <div className="relative flex w-full flex-1 flex-col gap-4 overflow-x-hidden px-4 py-4">
      {group.settled && (
        <img
          src="/assets/settledIndicator.png"
          alt="indicate the group is settled"
          className="pointer-events-none absolute top-[50%] left-[50%] w-[80%] translate-x-[-50%] translate-y-[-50%] -rotate-10 opacity-30 md:w-[60%]"
        />
      )}
      <ConfirmModal
        className="top-[20%] h-max max-w-[300px]"
        isOpen={openDeleteModal}
        content={`確定要刪除該群組嗎?`}
        closeModal={() => setOpenDeleteModal(false)}
        callback={handleDeleteGroup}
      />

      <MemberModal
        groupID={group.id}
        creatorID={group.creatorID}
        isOpen={openMemberModal}
        isGroupSettled={group.settled}
        closeModal={() => setOpenMemberModal(false)}
      />

      {/* header */}
      <div className="flex w-full items-center justify-between">
        {/* previous page arrow */}
        <PreviousPageArrow onClick={() => navigate("/home")} />
        {/* search bar */}
        <SearchBar
          debouncedCallback={debouncedSetFilter}
          directCallback={directSetFilter}
          className={`${haveExpense ? "bg-[var(--second-gray)]" : "pointer-events-none bg-gray-200 text-gray-300 grayscale-75"} flex items-center rounded-lg text-lg sm:text-xl`}
        />
      </div>
      {/* header */}
      <div className="flex w-full items-center justify-between">
        <span
          title={group.name}
          className="flex w-[250px] flex-wrap items-center text-2xl font-bold break-all text-[var(--primary-font)] md:w-[320px]"
        >
          {group.name}
        </span>
        <span className="ml-auto text-[14px] font-light break-all text-[var(--primary-font)] md:text-[16px]">
          於:&nbsp;{group.createdAt}
        </span>
      </div>
      {/* functional buttons */}
      <div className="flex w-full items-center justify-start gap-4">
        <FunctionButton
          className="p-2 text-sm md:px-4 md:py-2 md:text-[16px]"
          onClick={() => setOpenMemberModal(true)}
        >
          成員
        </FunctionButton>
        <FunctionButton
          onClick={() => navigate(`/home/group/${group.id}/settlement`)}
          className="p-2 text-sm md:px-4 md:py-2 md:text-[16px]"
        >
          結算
        </FunctionButton>
        <FunctionButton
          onClick={() => setOpenDeleteModal(true)}
          className={`${isPending ? "pointer-events-none grayscale-75" : ""} ml-auto h-[40px] w-[65px] p-2 text-sm hover:bg-red-500 hover:text-white md:px-4 md:py-2 md:text-[16px]`}
        >
          {isPending ? <Spinner size={24} /> : "刪除"}
        </FunctionButton>
        <FunctionButton
          disabled={group.settled}
          onClick={() => navigate(`addExpense`)}
          className={`${group.settled ? "pointer-events-none text-gray-400" : ""} h-[40px] w-[100px] p-2 text-sm md:px-4 md:py-2 md:text-[16px]`}
        >
          新增花費
        </FunctionButton>
      </div>
      {/* display expenses container */}
      <div className="flex w-full flex-col gap-4">
        {haveExpense ? (
          <div className="relative flex flex-col gap-4">
            {/* Expense cards grid */}
            <div className="grid w-full grid-cols-1 gap-2 space-y-4 space-x-2 lg:grid-cols-2">
              {isFetching && !isFetchingNextPage && <Spinner size={24} />}
              {expenses.map((expense) => (
                <ExpenseCard
                  onClick={() =>
                    navigate(`expense/${expense.id}?groupName=${group.name}`)
                  }
                  key={expense.id}
                  expense={expense}
                />
              ))}
            </div>

            {/* Load more button */}
            {hasNextPage && (
              <div className="flex w-full items-center justify-center">
                <FunctionButton
                  className="h-[40px] w-[120px]"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? <Spinner size={24} /> : "載入更多"}
                </FunctionButton>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center py-[20%]">
            <span className="text-xl font-bold text-[var(--primary-font)]">
              目前尚無任何花費...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
