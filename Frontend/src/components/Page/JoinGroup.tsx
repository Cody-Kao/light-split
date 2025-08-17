import { useNavigate, useParams } from "react-router";
import FunctionButton from "../FunctionButton";
import Spinner from "../Spinner";
import NotFound from "./NotFound";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useEffect, useState } from "react";
import Skeleton from "../Skeleton";
import { useGetJoinGroupData, useJoinGroup } from "../../Hooks/hooks";
import type { JoinGroupRequest } from "../../type/request";
import { showToast } from "../../utils/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { GetJoinGroupDataResponse } from "../../type/type";

export default function JoinGroup() {
  const { user, isChecking, logoutUser } = useLoginContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams();
  const openGroupID = params["openGroupID"];
  const groupID = params["groupID"];

  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [isReadyToFetch, setIsReadyToFetch] = useState(false);
  const {
    data,
    isPending: isDataPending,
    isFetching,
  } = useGetJoinGroupData(
    openGroupID ?? "",
    groupID ?? "",
    user?.id ?? "",
    isReadyToFetch,
  );
  const { mutate, isPending } = useJoinGroup();
  const handleSubmit = () => {
    if (!selectedID || !openGroupID || !groupID || !user) return;
    const data: JoinGroupRequest = {
      id: openGroupID,
      userID: user.id,
      groupID: groupID,
      memberID: selectedID,
    };
    mutate(data, {
      onSuccess: (res) => {
        if (res.type === "Logout") {
          logoutUser();
          navigate("/home/login");
        }
        if (res.type === "Error") {
          showToast(`加入群組失敗: ${res.payload.message}`);
          navigate(0);
          return;
        }
        showToast("加入成功！", true);
        queryClient.invalidateQueries({ queryKey: ["paginatedGroups"] });
        navigate(`/home/group/${GROUPID}`);
      },
    });
  };
  console.log("visit join");
  useEffect(() => {
    if (!isChecking && !user) {
      navigate("/home/login");
    }
  }, [isChecking, user]);

  // 如果使用者已經加入群組
  useEffect(() => {
    if (user?.groups.includes(groupID!)) {
      navigate("/home");
    }
  });
  useEffect(() => {
    if (user && openGroupID && groupID) {
      setIsReadyToFetch(true);
    } else {
      setIsReadyToFetch(false);
    }
  }, [openGroupID, groupID, user]);

  if (isChecking || !isReadyToFetch || isDataPending || !data) {
    return <Skeleton />;
  }
  if (data.type === "Error") {
    throw Error(data.payload?.message ?? "未知錯誤");
  }
  const {
    groupID: GROUPID,
    groupName,
    members,
  } = data.payload.data as GetJoinGroupDataResponse;

  if (isChecking) {
    return <Skeleton />;
  }
  if (openGroupID === "" || groupID === "") {
    return <NotFound />;
  }
  return (
    <div className="mt-[30%] flex h-full w-full flex-col items-center justify-start gap-2 md:mt-[15%]">
      <span className="text-xl text-[var(--primary-font)]">以:</span>

      {/* Outer wrapper with border-radius */}
      <div className="w-[70%] overflow-hidden rounded-lg bg-[var(--second-white)] shadow-2xl md:w-[50%]">
        {/* Scrollable inner container with no border-radius */}
        <div className="flex h-[300px] flex-col items-center gap-4 overflow-auto px-2 py-4">
          {isDataPending || isFetching ? (
            <Spinner size={36} />
          ) : (
            members.map((member) => (
              <label
                key={member.id}
                htmlFor={member.id}
                className="flex w-full cursor-pointer items-center justify-start gap-4 rounded-lg border border-slate-200 px-4 py-2 transition-colors hover:bg-slate-100 dark:border-gray-500"
              >
                <input
                  className="scale-150 cursor-pointer"
                  type="radio"
                  name="member"
                  id={member.id}
                  checked={selectedID === member.id}
                  onChange={() => setSelectedID(member.id)}
                />
                <span className="text-xl">{member.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <span className="text-xl text-[var(--primary-font)]">的身分加入:</span>
      <h1 className="flex w-[300px] items-center justify-center truncate text-2xl font-bold text-[var(--primary-font)] sm:text-3xl">
        {groupName}
      </h1>
      <FunctionButton
        disabled={isPending}
        onClick={handleSubmit}
        className={`${isPending ? "pointer-events-none bg-gray-200 grayscale-75" : ""} mt-4 h-[40px] w-[65px]`}
      >
        {isPending ? <Spinner color="#bbbdbb" size={24} /> : "加入"}
      </FunctionButton>
    </div>
  );
}
