import { useNavigate } from "react-router";
import type { TGroupCard } from "../type/type";
import { useLoginContext } from "../context/LoginContextProvider";

export default function GroupCard({ group }: { group: TGroupCard }) {
  const { user } = useLoginContext();
  const navigate = useNavigate();
  return (
    <div
      key={group.id}
      onClick={() => navigate(`/home/group/${group.id}`)}
      className="group relative flex h-[120px] flex-col justify-between overflow-hidden rounded-xl bg-[var(--second-white)] px-4 py-2 shadow-xl hover:cursor-pointer"
    >
      {/* settled image */}
      {group.settled && (
        <img
          src="/assets/settledIndicator.png"
          alt="indicate the group is settled"
          className="pointer-events-none absolute right-[40px] bottom-0 h-20 w-20 -rotate-10 opacity-80"
        />
      )}
      <div className="absolute bottom-0 left-0 block h-[10px] w-full bg-[var(--second-gray)] transition-all duration-200 group-hover:block sm:hidden dark:bg-gray-400"></div>
      <div className="flex items-center justify-between">
        <p title={group.name} className="w-[250px] truncate font-bold">
          {group.name}
        </p>
        <span className="text-sm font-light">{group.createdAt}</span>
      </div>
      <div className="flex items-center justify-between">
        <p className="w-[50%] font-bold text-[var(--success-text)] lg:w-[30%]">
          成員:&nbsp;{group.memberCnt}
        </p>
        <p
          title={group.creatorName}
          className="w-[250px] truncate text-end text-sm"
        >
          建立者:&nbsp;
          {group.creatorID === user?.id ? "你" : group.creatorName}
        </p>
      </div>
    </div>
  );
}
