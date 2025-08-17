import { useState } from "react";
import { TimeLine } from "../../const/const";
import { groupByTime, useDebounce } from "../../utils/utils";
import FunctionButton from "../FunctionButton";
import GroupCard from "../GroupCard";
import SearchBar from "../SearchBar";
import AddGroupModal from "../Modal/AddGroupModal";
import type { TGroupCard } from "../../type/type";
import { usePaginatedGroups } from "../../Hooks/hooks";
import { GroupsResponseSchema } from "../../Schema/schema";
import Spinner from "../Spinner";

export default function Groups({
  groupCardsDate,
  haveMoreCards,
}: {
  groupCardsDate: TGroupCard[];
  haveMoreCards: boolean;
}) {
  const [openAddGroup, setOpenAddGroup] = useState(false);
  const [filter, setFilter] = useState("");
  const [debouncedSetFilter, directSetFilter] = useDebounce(setFilter, 1000);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePaginatedGroups(
      GroupsResponseSchema,
      // pre-populated page 0
      {
        pages: [
          {
            payload: {
              data: {
                groupCards: groupCardsDate,
                haveMore: haveMoreCards,
              },
            },
          },
        ],
        pageParams: [0],
      },
    );
  if (!data) {
    throw Error("data is undefined");
  }
  let allGroups = data.pages.flatMap(
    (page) => page.payload.data.groupCards,
  ) as TGroupCard[];
  const haveGroups = allGroups.length > 0;

  if (filter) {
    allGroups = allGroups.filter((group) => group.name.startsWith(filter));
  }
  const grouped = groupByTime(allGroups);

  return (
    <div className="flex w-full flex-1 flex-col px-4 py-4">
      {/* 新增群組 Modal */}
      <AddGroupModal
        className="max-w-[550px]"
        isOpen={openAddGroup}
        closeModal={() => setOpenAddGroup(false)}
      />

      {/* 功能區域：新增群組 + 搜尋 */}
      <div className="flex w-full items-center">
        <FunctionButton
          className="text-sm"
          onClick={() => setOpenAddGroup(true)}
        >
          新增群組
        </FunctionButton>
        <SearchBar
          debouncedCallback={debouncedSetFilter}
          directCallback={directSetFilter}
          className={`${haveGroups ? "" : "pointer-events-none bg-gray-200 text-gray-300 grayscale-75"} ml-auto`}
        />
      </div>

      {/* 群組清單區域 */}
      <div className="mt-4 flex w-full flex-col gap-4">
        {haveGroups ? (
          <>
            {TimeLine.map(
              (timeStamp) =>
                grouped[timeStamp].length > 0 && (
                  <div key={timeStamp}>
                    {/* 時間標題 */}
                    <div className="mb-4 flex flex-col text-[var(--primary-font)]">
                      <div className="text-xl font-bold after:block after:h-[1px] after:w-full after:bg-[var(--primary-font)] after:content-['']">
                        {timeStamp}
                      </div>
                    </div>

                    {/* 群組卡片 */}
                    <div className="grid w-full grid-cols-1 gap-2 space-y-2 lg:grid-cols-2">
                      {grouped[timeStamp].map((group) => (
                        <GroupCard key={group.id} group={group} />
                      ))}
                    </div>
                  </div>
                ),
            )}

            {/* 載入更多按鈕 */}
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
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center py-[20%]">
            <span className="text-xl font-bold text-[var(--primary-font)]">
              目前尚未加入任何群組...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
