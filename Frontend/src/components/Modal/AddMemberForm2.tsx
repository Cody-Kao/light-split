import { useState, type ComponentProps, type FormEvent } from "react";
import { cn, showToast, ValidateInput } from "../../utils/utils";
import FunctionButton from "../FunctionButton";
import {
  LessThan10Words,
  NonEmpty,
  OnlyAlphanumericChineseAndSpace,
} from "../../const/const";
import InputErrorMsg from "../InputErrorMsg";
import { useAddMember } from "../../Hooks/hooks";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import Spinner from "../Spinner";
import type { AddMember, AddMemberRequest } from "../../type/request";

type AddMemberFormProps = {
  groupID: string;
  closeForm: () => void;
  callback?: () => boolean | void;
} & ComponentProps<"form">;

interface inputField {
  value: string;
  errorMsg: string;
}
// specifically for adding member only, not for creating group
export default function AddMemberForm2({
  groupID,
  closeForm,
  callback,
  className,
  ...props
}: AddMemberFormProps) {
  const { user, logoutUser } = useLoginContext();
  const navigate = useNavigate();
  const [inputFields, setInputFields] = useState<inputField[]>([
    { value: "", errorMsg: "" },
  ]);
  const queryClient = useQueryClient();
  const { mutate, isPending } = useAddMember();

  // Add a new empty input
  const handleAdd = () =>
    setInputFields([...inputFields, { value: "", errorMsg: "" }]);

  // Remove input by index
  const handleRemove = (index: number) => {
    setInputFields(inputFields.filter((_, i) => i !== index));
  };

  // Update the value of a specific input
  const handleChange = (index: number, value: string) => {
    const newInputFields = [...inputFields];
    newInputFields[index].value = value;
    setInputFields(newInputFields);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (callback) {
      const isTitleValid = callback();
      if (typeof isTitleValid === "boolean" && !isTitleValid) return;
    }
    for (let i = 0; i < inputFields.length; i++) {
      const [isValid, errorMsg] = ValidateInput(
        inputFields[i].value,
        NonEmpty,
        OnlyAlphanumericChineseAndSpace,
        LessThan10Words,
      );
      if (!isValid) {
        setInputFields((prev) => {
          const updated = [...prev]; // 1. clone the array
          updated[i] = { ...updated[i], errorMsg }; // 2. update just one item
          return updated; // 3. return the new array
        });
        return;
      }
    }
    const members: AddMember[] = inputFields.map((inputField) => ({
      name: inputField.value,
    }));
    const data: AddMemberRequest = {
      userID: user.id,
      groupID: groupID,
      members,
    };
    mutate(data, {
      onSuccess: (res) => {
        if (res.type === "Logout") {
          logoutUser();
          navigate("/home/login");
        }
        if (res.type === "Error") {
          showToast(`成員新增失敗: ${res.payload.message}`);
          return;
        }
        showToast("成員新增成功！", true);
        queryClient.invalidateQueries({ queryKey: ["members", groupID] });
        queryClient.invalidateQueries({
          queryKey: ["getJoinGroupLink", groupID],
        });
      },
    });

    cleanUp();
    closeForm();
  };

  const cleanUp = () => {
    setInputFields([{ value: "", errorMsg: "" }]);
  };

  return (
    <form
      className={cn("flex w-full flex-col gap-4 px-2", className)}
      {...props}
      onSubmit={(e) => handleSubmit(e)}
    >
      {inputFields.map((inputField, index) => (
        <div key={index} className="flex w-full items-center gap-1 sm:gap-2">
          <span className="text-md text-[var(--primary-font)] sm:text-xl">
            {index + 1}.
          </span>
          <div className="relative flex w-[80%] flex-col">
            <input
              required
              placeholder="名稱"
              type="text"
              value={inputField.value}
              onChange={(e) => handleChange(index, e.target.value)}
              className={cn(
                "w-full rounded-lg border p-4 py-2 text-lg text-[var(--primary-font)] outline-none sm:text-xl",
                inputField.errorMsg ? "border-red-500" : "border-slate-300",
              )}
            />
            {inputField.errorMsg && (
              <InputErrorMsg content={inputField.errorMsg} />
            )}
          </div>

          {inputFields.length > 1 && (
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className={`${isPending ? "pointer-events-none grayscale-75" : ""} h-[40px] w-[65px] text-sm text-red-500 hover:cursor-pointer`}
              disabled={isPending}
            >
              {isPending ? <Spinner size={24} /> : "刪除"}
            </button>
          )}
        </div>
      ))}

      <FunctionButton
        type="button"
        onClick={handleAdd}
        className="mt-6 self-start text-sm text-blue-500 hover:text-white hover:underline"
      >
        ＋新增成員欄位
      </FunctionButton>
      <div className="mt-6 flex w-full justify-end gap-4 px-4">
        <FunctionButton
          type="button"
          onClick={() => {
            cleanUp();
            closeForm();
          }}
        >
          取消
        </FunctionButton>
        <FunctionButton type="submit">確定</FunctionButton>
      </div>
    </form>
  );
}
