import { FaCrown } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import FunctionButton from "../FunctionButton";
import { useCallback, useState, type ComponentProps } from "react";
import ConfirmModal from "./ConfirmModal";
import ImageDisplay from "../ImageDisplay";
import AddMemberModal from "./AddMemberModal";
import Modal from "./Modal";
import { useLoginContext } from "../../context/LoginContextProvider";
import {
  useDeleteMember,
  useGetJoinGroupLink,
  useMembersQuery,
} from "../../Hooks/hooks";
import { GetJoinGroupLinkResponse, MemberSchema } from "../../Schema/schema";
import { z } from "zod";
import { FaArrowRotateLeft } from "react-icons/fa6";
import Spinner from "../Spinner";
import type { TMember } from "../../type/type";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "../../utils/utils";
import { useNavigate } from "react-router";
import { FaRegCopy } from "react-icons/fa6";

type MemberModalProps = {
  groupID: string;
  creatorID: string;
  isOpen: boolean;
  isGroupSettled: boolean;
  closeModal: () => void;
} & ComponentProps<"div">;

export default function MemberModal({
  groupID,
  creatorID,
  isOpen,
  isGroupSettled,
  closeModal,
}: MemberModalProps) {
  const { user, logoutUser } = useLoginContext();
  const navigate = useNavigate();
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openAddMemberModal, setOpenAddMemberModal] = useState(false);
  const [toDeleteMemberID, setToDeleteMemberID] = useState("");

  const {
    data: JoinGroupLinkResponse,
    isPending: isJoinGroupLinkPending,
    isFetching: isFetchingJoinGroupLink,
  } = useGetJoinGroupLink(user!.id, groupID, GetJoinGroupLinkResponse);

  const { mutate: deleteMember, isPending: isMutationPending } =
    useDeleteMember();
  const handleDelete = () => {
    if (!user || user.id !== creatorID) return;
    deleteMember(
      {
        userID: user.id,
        groupID: groupID,
        memberID: toDeleteMemberID,
      },
      {
        onSuccess: (res) => {
          if (res.type === "Logout") {
            logoutUser();
            navigate("/home/login");
          }
          if (res.type === "Error") {
            showToast(`刪除失敗: ${res.payload.message}`);
            return;
          }
          showToast("刪除成功！", true);
          queryClient.invalidateQueries({ queryKey: ["members", groupID] });
          queryClient.invalidateQueries({ queryKey: ["paginatedExpenses"] });
          queryClient.invalidateQueries({
            queryKey: ["getJoinGroupLink", groupID],
          });
        },
      },
    );
  };
  const closeDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
  }, []);

  const queryClient = useQueryClient();
  const { data, isPending, isFetching } = useMembersQuery(
    groupID,
    z.array(MemberSchema),
  );
  if (!data || isPending) {
    return <Spinner size={24} />;
  }
  const members = data.payload.data as TMember[];
  const sortedMembers = [
    ...members.filter((member) => member.userID === creatorID),
    ...members.filter((member) => member.userID !== creatorID),
  ];
  const isToDeleteMemberJoined =
    members.find((member) => member.id === toDeleteMemberID)?.joined ?? false;

  const isLinkDisabled =
    isGroupSettled ||
    !JoinGroupLinkResponse ||
    JoinGroupLinkResponse.type === "Error" ||
    isJoinGroupLinkPending ||
    isFetchingJoinGroupLink;

  const isAddButtonDisabled =
    isGroupSettled || isJoinGroupLinkPending || isFetchingJoinGroupLink;

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <ConfirmModal
        className="top-[20%] h-max max-w-[300px]"
        isOpen={openDeleteModal}
        content={
          isToDeleteMemberJoined
            ? `確定要移除該使用者嗎?\n此操作會把該成員的相關花費一併刪除`
            : "確定要移除該使用者嗎?"
        }
        closeModal={closeDeleteModal}
        callback={handleDelete}
      />
      <header className="mb-[-20px] flex w-full items-center justify-between">
        {!isGroupSettled && (
          <FunctionButton
            disabled={isLinkDisabled}
            onClick={() => {
              navigator.clipboard.writeText(
                "http://localhost:5173/home" +
                  JoinGroupLinkResponse?.payload.data.link,
              );
              showToast("已複製邀請連結", true);
            }}
            className={`${isLinkDisabled ? "pointer-events-none bg-gray-200 text-gray-400 grayscale-75" : ""} flex h-[40px] w-[90px] items-center gap-1 px-2 text-[14px] sm:w-[100px] sm:text-[16px]`}
          >
            邀請連結
            {isJoinGroupLinkPending || isFetchingJoinGroupLink ? (
              <Spinner size={16} />
            ) : (
              <FaRegCopy />
            )}
          </FunctionButton>
        )}
        <button
          className={`${isFetching ? "pointer-events-none text-gray-400 grayscale-50" : ""} ml-auto flex items-center text-[var(--primary-font)] decoration-[var(--third-blue)] hover:cursor-pointer hover:text-[var(--third-blue)] hover:underline`}
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["members", groupID] });
            queryClient.invalidateQueries({
              queryKey: ["getJoinGroupLink", groupID],
            });
          }}
        >
          刷新&nbsp;
          <FaArrowRotateLeft />
        </button>
      </header>
      {sortedMembers.map((member) => (
        <div
          key={member.id}
          className={`${member.joined ? "" : "font-light text-gray-400"} flex w-full flex-wrap items-center justify-start rounded-lg px-2 py-2 shadow-lg dark:border-b-1 dark:border-[var(--second-gray)]`}
        >
          <ImageDisplay
            fallback={(props) => <FaRegCircleUser {...props} />}
            imageURL={member.image}
          />
          <span className="w-[120px] truncate text-xl text-[var(--primary-font)] sm:w-max sm:max-w-[250px] sm:text-2xl">
            {member.name}&nbsp;
          </span>

          <span className="w-max max-w-[100px] truncate text-[var(--primary-font)] sm:max-w-[150px]">
            {member.joined
              ? member.userID === user?.id
                ? "(你/妳)"
                : member.userName
              : "(等待加入)"}
          </span>

          {member.userID === creatorID && (
            <span className="ml-auto flex items-center justify-center text-blue-500 dark:font-bold dark:text-[var(--third-blue)]">
              建立者&nbsp;
              <FaCrown />
            </span>
          )}
          {!isGroupSettled &&
            user?.id === creatorID &&
            member.userID !== creatorID && (
              <div className="ml-auto flex items-center justify-center">
                <FunctionButton
                  onClick={() => {
                    setOpenDeleteModal(true);
                    setToDeleteMemberID(member.id);
                  }}
                  className={`h-[40px] w-[65px] hover:bg-[var(--warn-text)] ${isGroupSettled || isMutationPending ? "pointer-events-none text-gray-400" : ""}`}
                  disabled={isGroupSettled || isMutationPending}
                >
                  {isMutationPending ? <Spinner size={16} /> : "刪除"}
                </FunctionButton>
              </div>
            )}
        </div>
      ))}
      {/* add new member */}
      {!isGroupSettled && user?.id === creatorID && (
        <FunctionButton
          disabled={isAddButtonDisabled}
          className={`${isAddButtonDisabled && "pointer-events-none text-gray-400"}`}
          onClick={() => setOpenAddMemberModal(true)}
        >
          新增成員
        </FunctionButton>
      )}
      <AddMemberModal
        className="top-0 min-h-[250px] w-[90%] max-w-[500px]"
        isOpen={openAddMemberModal}
        closeModal={() => setOpenAddMemberModal(false)}
        groupID={groupID}
      />
    </Modal>
  );
}
