import type { ComponentProps } from "react";
import FunctionButton from "../FunctionButton";
import Modal from "./Modal";

type ConfirmModalProps = {
  isOpen: boolean;
  content: string;
  closeModal: () => void;
  callback: () => void;
} & ComponentProps<"div">;

export default function ConfirmModal({
  isOpen,
  content,
  closeModal,
  callback,
  className,
  ...props
}: ConfirmModalProps) {
  return (
    <Modal className={className} isOpen={isOpen} closeModal={closeModal}>
      <div
        className="flex w-full flex-col items-center justify-between gap-4 px-4"
        {...props}
      >
        <span className="w-full text-left text-xl font-bold text-[var(--primary-font)]">
          {/* 讓\n實現換行 */}
          {content.split("\n").map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </span>
        <div className="mt-auto flex w-full items-center justify-end gap-2">
          <FunctionButton onClick={closeModal}>取消</FunctionButton>
          <FunctionButton
            className="bg-[var(--warn-text)] text-white sm:bg-[var(--second-gray)] sm:text-black sm:hover:bg-[var(--warn-text)] sm:hover:text-white"
            onClick={() => {
              callback();
              closeModal();
            }}
          >
            確定
          </FunctionButton>
        </div>
      </div>
    </Modal>
  );
}
