import { useState, type ComponentProps } from "react";
import Modal from "./Modal";
import AddMemberForm from "./AddMemberForm";
import { ValidateInput } from "../../utils/utils";
import {
  LessThan10Words,
  LessThan20Words,
  NonEmpty,
  OnlyAlphanumericChineseAndSpace,
} from "../../const/const";
import InputErrorMsg from "../InputErrorMsg";
import TextInput from "../TextInput";

type AddGroupModalProps = {
  isOpen: boolean;
  closeModal: () => void;
} & ComponentProps<"div">;

export default function AddGroupModal({
  isOpen,
  closeModal,
  className,
  ...props
}: AddGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [groupNameErrorMsg, setGroupNameErrorMsg] = useState("");
  const [groupCreatorName, setGroupCreatorName] = useState("");
  const [groupCreatorNameErrorMsg, setGroupCreatorNameErrorMsg] = useState("");
  const onSubmit = (): boolean => {
    const [isGroupNameValid, groupNameErrorMsg] = ValidateInput(
      groupName,
      NonEmpty,
      OnlyAlphanumericChineseAndSpace,
      LessThan20Words,
    );
    if (!isGroupNameValid) {
      setGroupNameErrorMsg(groupNameErrorMsg);
      return false;
    }
    setGroupNameErrorMsg("");
    const [isGroupCreatorNameValid, groupCreatorNameErrorMsg] = ValidateInput(
      groupCreatorName,
      NonEmpty,
      OnlyAlphanumericChineseAndSpace,
      LessThan10Words,
    );
    if (!isGroupCreatorNameValid) {
      setGroupCreatorNameErrorMsg(groupCreatorNameErrorMsg);
      return false;
    }
    setGroupCreatorNameErrorMsg("");

    return true;
  };

  const closeForm = () => {
    // clean up
    setGroupName("");
    setGroupNameErrorMsg("");
    setGroupCreatorName("");
    setGroupCreatorNameErrorMsg("");
    closeModal();
  };
  return (
    <Modal
      isOpen={isOpen}
      closeModal={closeModal}
      className={className}
      {...props}
    >
      <h2 className="text-xl font-bold text-[var(--primary-font)] sm:text-2xl">
        新增群組
      </h2>
      <div className="relative flex w-full flex-col items-start justify-center gap-1 sm:flex-row sm:items-center sm:justify-start">
        <span className="text-[var(--primary-font)]">群組名稱</span>
        <TextInput
          type="text"
          placeholder="群組名稱"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className={`${groupNameErrorMsg !== "" ? "ring-1 ring-red-500" : ""} w-[80%] max-w-[300px]`}
        />
        {groupNameErrorMsg !== "" && (
          <InputErrorMsg content={groupNameErrorMsg} />
        )}
      </div>
      <div className="relative flex w-full flex-col items-start justify-center gap-1 sm:flex-row sm:items-center sm:justify-start">
        <span className="text-[var(--primary-font)]">您的稱呼</span>
        <TextInput
          type="text"
          placeholder="您的稱呼"
          value={groupCreatorName}
          onChange={(e) => setGroupCreatorName(e.target.value)}
          className={`${groupCreatorNameErrorMsg !== "" ? "ring-1 ring-red-500" : ""} w-[80%] max-w-[300px]`}
        />
        {groupCreatorNameErrorMsg !== "" && (
          <InputErrorMsg content={groupCreatorNameErrorMsg} />
        )}
      </div>
      <h3 className="text-lg font-bold text-[var(--primary-font)] sm:text-xl">
        新增其餘成員
      </h3>
      <AddMemberForm
        callback={onSubmit}
        closeForm={closeForm}
        groupName={groupName}
        groupCreatorName={groupCreatorName}
        className="gap-6"
      />
    </Modal>
  );
}
