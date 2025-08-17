import { type ComponentProps } from "react";

import Modal from "./Modal";
import AddMemberForm2 from "./AddMemberForm2";

type AddMemberModalProps = {
  groupID: string;
  isOpen: boolean;
  closeModal: () => void;
} & ComponentProps<"div">;

export default function AddMemberModal({
  groupID,
  isOpen,
  closeModal,
  className,
}: AddMemberModalProps) {
  return (
    <Modal
      className={className}
      isOpen={isOpen}
      overlayOpacity={50}
      closeModal={closeModal}
    >
      <span className="px-2 text-xl text-[var(--primary-font)] sm:text-2xl">
        新增成員
      </span>

      <AddMemberForm2
        closeForm={closeModal}
        groupID={groupID}
        className="mt-4 gap-6"
      />
    </Modal>
  );
}
