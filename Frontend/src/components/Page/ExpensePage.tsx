import { useNavigate, useSearchParams } from "react-router";
import PreviousPageArrow from "../PreviousPageArrow";
import FunctionButton from "../FunctionButton";
import TextInput from "../TextInput";
import { useRef, useState } from "react";
import Select from "../Select";
import {
  currencyOptions,
  LessThan20Words,
  maxFileLimit,
  NonEmpty,
  OnlyAlphanumericChineseAndSpace,
  PositiveNumberOnly,
} from "../../const/const";
import RadioButtonArea from "../RadioButtonArea";
import type {
  TPayer,
  RadioOption,
  TExpensePageResponse,
} from "../../type/type";
import {
  formatNumberInput,
  showToast,
  trimZero,
  ValidateInput,
} from "../../utils/utils";
import InputErrorMsg from "../InputErrorMsg";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import ImageDisplay from "../ImageDisplay";
import { v4 as uuid } from "uuid";
import { useLoginContext } from "../../context/LoginContextProvider";
import ConfirmModal from "../Modal/ConfirmModal";
import { useDeleteExpense, useUpdateExpense } from "../../Hooks/hooks";
import type {
  DeleteExpenseRequest,
  ExpenseUpdateRequest,
} from "../../type/request";
import { useQueryClient } from "@tanstack/react-query";
import Spinner from "../Spinner";

const defaultPayer: TPayer = {
  id: "",
  userID: "",
  name: "",
  amount: 0,
};
const radioButtonOptions: RadioOption[] = [
  { label: "是", value: true },
  { label: "否", value: false },
];
const idToName: Record<string, string> = {};
const CURRENCY = ["台幣", "美金", "日幣"] as const;

export default function ExpensePage({
  expensePageResponse,
}: {
  expensePageResponse: TExpensePageResponse;
}) {
  const { user, logoutUser } = useLoginContext();
  const queryClient = useQueryClient();
  const { mutate, isPending: isUpdatePending } = useUpdateExpense();
  const navigate = useNavigate();
  const { expense, members, isGroupSettled } = expensePageResponse;
  const creatorName =
    members.find((member) => member.userID === expense.creatorID)?.name ??
    "Unknown";
  members.forEach(({ userID, name }) => {
    idToName[userID] = name;
  });
  const users: { id: string; name: string; userID: string }[] = members.map(
    (member) =>
      member.userID === user?.id
        ? { id: member.id, name: "你/妳", userID: member.userID }
        : member,
  );
  const [searchParams] = useSearchParams();
  const groupName = searchParams.get("groupName");
  // 花費名稱
  const oldExpenseName = expense.name;
  const [expenseName, setExpenseName] = useState(oldExpenseName);
  const [expenseNameErrorMsg, setExpenseNameErrorMsg] = useState("");
  // 實際付款人
  const oldActualPayerID = expense.actualPayer;
  const [actualPayerID, setActualPayer] = useState(oldActualPayerID);
  // 花費金額
  const oldAmount = expense.amount.toString(); // use string type is more convenient
  const [amount, setAmount] = useState(oldAmount);
  const [amountErrorMsg, setAmountErrorMsg] = useState("");
  // 花費幣別
  const oldCurrency = expense.currency;
  const [currency, setCurrency] = useState(oldCurrency);
  // 是否平分
  const oldSplit = expense.split;
  const [split, setSplit] = useState(oldSplit);
  // image preview for image upload
  // 用這個state去表示使用者是否有上傳圖片，因為沒辦法清空acceptedFiles(哪怕使用者先上傳後又不想要)
  // 所以用URL是否為null去判斷
  const oldImagePreviewURL = expense.image ? expense.image : null;
  const [imagePreviewURL, setImagePreviewURL] = useState<string | null>(
    oldImagePreviewURL,
  );

  // 去除掉實際付款人，剩下的人才會是付款人的選項
  const filteredUsers = users.filter((user) => user.userID !== actualPayerID);
  // 付款人state array
  const isComposingRef = useRef(false);
  const oldPayers: TPayer[] = expense.payers;
  const [payers, setPayers] = useState(oldPayers);
  // 結算用的array
  const settlement: [string, number][] = split
    ? filteredUsers.map((user) => [
        user.name,
        parseFloat(amount) / users.length,
      ])
    : [
        ...Object.entries(
          payers.reduce(
            (acc, { name, amount, userID }) => {
              // 跟select一樣要自動更改名稱顯示邏輯
              if (userID === actualPayerID) {
                name = filteredUsers[0].name;
              }
              const parsed = parseFloat(amount.toString());
              acc[name] = (acc[name] || 0) + (isNaN(parsed) ? 0 : parsed);
              return acc;
            },
            {} as Record<string, number>,
          ),
        ),
      ];
  // 加上實際付款人應收回的金額
  settlement.push([
    users.find((user) => user.userID === actualPayerID)?.name ?? "Unknown",
    settlement.reduce((prev, settle) => prev + settle[1], 0),
  ]);
  console.log(settlement);
  const [oldNote, _] = useState(expense.note);
  const noteRef = useRef<HTMLDivElement | null>(null);
  const [noteErrorMsg, setNoteErrorMsg] = useState("");

  // 最後送出的金額檢查errorMsg
  const [amountCheckErrorMsg, setAmountCheckErrorMsg] = useState("");

  // 刪除modal開關控制
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const closeDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
  }, []);
  // mutation wrapper
  const { mutate: deleteExpense, isPending } = useDeleteExpense();
  const handleDelete = () => {
    if (!user || user.id !== expense.creatorID) return;
    const data: DeleteExpenseRequest = {
      userID: user.id,
      groupID: expense.groupID,
      expenseID: expense.id,
    };
    deleteExpense(data, {
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
        queryClient.invalidateQueries({ queryKey: ["paginatedExpenses"] });
        navigate(`/home/group/${expense.groupID}`);
      },
    });
  };

  const handleAmountChange = (value: string) => {
    if (amount === "" && value === ".") return;

    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(isComposingRef.current ? value : formatNumberInput(value));
    }
  };

  const handleUpdatePayer = (
    index: number,
    value: string,
    field: keyof TPayer,
  ) => {
    setPayers((payers) => {
      if (field === "amount") {
        // Allow only digits and at most one dot
        if (!/^\d*\.?\d*$/.test(value)) return payers;
        value = isComposingRef.current ? value : formatNumberInput(value);
      }
      const newPayers = [...payers];
      newPayers[index] = {
        ...newPayers[index],
        [field]: value,
      };

      return newPayers;
    });
  };

  const handleAddPayer = () => {
    setPayers((payers) => [
      ...payers,
      {
        ...defaultPayer,
        id: uuid(),
        userID: filteredUsers[0].userID,
        name: filteredUsers[0].name,
      },
    ]);
  };

  const handleRemovePayer = (index: number) => {
    setPayers((payers) => payers.filter((_, idx) => idx !== index));
  };

  // 送出後的檢查
  const handleExpenseNameValidation = (): boolean => {
    const [isValid, errorMsg] = ValidateInput(
      expenseName,
      NonEmpty,
      OnlyAlphanumericChineseAndSpace,
      LessThan20Words,
    );
    if (!isValid) {
      setExpenseNameErrorMsg(errorMsg);
      return false;
    }
    setExpenseNameErrorMsg("");

    return true;
  };
  const handleAmountValidation = (): boolean => {
    if (parseFloat(amount) === 0) {
      setAmountErrorMsg("實際支出必須大於0");
      return false;
    }
    const [isValid, errorMsg] = ValidateInput(
      amount,
      NonEmpty,
      PositiveNumberOnly,
    );
    if (!isValid) {
      setAmountErrorMsg(errorMsg);
      return false;
    }
    setAmountErrorMsg("");

    return true;
  };
  const handleAmountBalance = (): boolean => {
    if (split) {
      setAmountCheckErrorMsg("");
      return true;
    }
    const totalPayerAmount = payers.reduce(
      // convert number to string and then back to float can resolve some formatting problems out of box
      (pre, payer) => parseFloat(payer.amount.toString()) + pre,
      0,
    );
    console.log(parseFloat(amount), totalPayerAmount, payers);
    if (parseFloat(amount) !== totalPayerAmount) {
      setAmountCheckErrorMsg("實際支付與花費總和必須相等");
      return false;
    }
    setAmountCheckErrorMsg("");

    return true;
  };
  const handleNoteWordLimit = () => {
    if (noteRef.current && noteRef.current.innerText.length > 350) {
      setNoteErrorMsg("備註字數不得超過350個字元");
      return false;
    }
    setNoteErrorMsg("");

    return true;
  };

  // clear all updates, and rollback
  const rollback = () => {
    setExpenseName(oldExpenseName);
    setActualPayer(oldActualPayerID);
    setAmount(oldAmount);
    setCurrency(oldCurrency);
    setImagePreviewURL(oldImagePreviewURL);
    setSplit(oldSplit);
    setPayers(oldPayers);
    if (noteRef.current) noteRef.current.innerText = oldNote;
  };

  // 建立需要傳送更新的object
  const generateExpenseUpdate = (): ExpenseUpdateRequest => {
    let expenseUpdate: ExpenseUpdateRequest = {
      userID: user!.id,
      groupID: expense.groupID,
      expenseID: expense.id,
      split: split,
      remove: [],
      add: [],
      update: [],
    };
    // general fields
    if (expenseName !== oldExpenseName)
      expenseUpdate.expenseName = expenseName.trim();
    if (amount !== oldAmount)
      expenseUpdate.amount = Math.floor(parseFloat(amount) * 10) / 10;
    if (actualPayerID !== oldActualPayerID)
      expenseUpdate.actualPayerID = actualPayerID;
    if (currency !== oldCurrency) expenseUpdate.currency = currency;
    if (noteRef.current && noteRef.current.innerText !== oldNote)
      expenseUpdate.note = noteRef.current.innerText.trim();

    // payers
    const oldMap = new Map(oldPayers.map((p) => [p.id, p]));
    const newMap = new Map(payers.map((p) => [p.id, p]));

    const remove: string[] = [];
    const add: TPayer[] = [];
    const update: Partial<TPayer>[] = [];

    // Find removed and updated
    for (const oldPayer of oldPayers) {
      if (!newMap.has(oldPayer.id)) {
        remove.push(oldPayer.id);
      } else {
        const newPayer = newMap.get(oldPayer.id)!;
        const changes: Partial<TPayer> = { id: oldPayer.id };

        if (oldPayer.userID !== newPayer.userID)
          changes.userID = newPayer.userID;
        if (oldPayer.name !== newPayer.name) changes.name = newPayer.name;
        const oldAmount =
          Math.floor(parseFloat(oldPayer.amount.toString()) * 10) / 10;
        const newAmount =
          Math.floor(parseFloat(newPayer.amount.toString()) * 10) / 10;
        if (oldAmount !== newAmount) changes.amount = newAmount;

        if (Object.keys(changes).length > 1) {
          // more than just the `id`
          update.push(changes);
        }
      }
    }

    // Find add
    for (const newPayer of payers) {
      if (!oldMap.has(newPayer.id)) {
        add.push({
          ...newPayer,
          amount: Math.floor(parseFloat(newPayer.amount.toString()) * 10) / 10,
        });
      }
    }

    expenseUpdate.remove = remove;
    expenseUpdate.add = add;
    expenseUpdate.update = update;
    return expenseUpdate;
  };

  const handleSubmit = () => {
    if (!user || !noteRef.current) return;
    if (!handleExpenseNameValidation()) return;
    if (!handleAmountValidation()) return;
    if (!handleAmountBalance()) return;
    if (!handleNoteWordLimit()) return;
    const expenseUpdate = generateExpenseUpdate();
    console.log("send expenseUpdate: ", expenseUpdate);
    // 檢查是否有必要更新
    if (
      !expenseUpdate.expenseName &&
      !expenseUpdate.amount &&
      !expenseUpdate.actualPayerID &&
      !expenseUpdate.currency &&
      !expenseUpdate.note &&
      expenseUpdate.split === oldSplit &&
      expenseUpdate.add.length == 0 &&
      expenseUpdate.update.length == 0 &&
      expenseUpdate.remove.length == 0 &&
      imagePreviewURL === oldImagePreviewURL
    ) {
      showToast("資料一致; 不需要更新", true);
      return;
    }

    const data = new FormData();
    if (imagePreviewURL && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > maxFileLimit) {
        alert("檔案過大，不得超過3MB");
        return;
      }
      data.append("image", file);
    }
    data.append("request", JSON.stringify(expenseUpdate));
    mutate(data, {
      onSuccess: (res) => {
        if (res.type === "Logout") {
          logoutUser();
          navigate("/home/login");
        }
        if (res.type === "Error") {
          showToast(`更新花費失敗: ${res.payload.message}`);
          return;
        }
        showToast("花費更新成功！", true);
        queryClient.invalidateQueries({ queryKey: ["paginatedExpenses"] });
        queryClient.invalidateQueries({
          queryKey: ["expensePage", expense.groupID, expense.id],
        });
        console.log("成功", expenseUpdate);
        navigate(`/home/group/${expense.groupID}/expense/${expense.id}`);
      },
    });
  };

  // react dropzone for image upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Do something with the files
    if (acceptedFiles.length > 0) {
      setImagePreviewURL(URL.createObjectURL(acceptedFiles[0]));
    }
  }, []);
  // acceptedFiles[0]去取得上傳的image file，再放入formData傳給後端
  const {
    acceptedFiles,
    fileRejections,
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    multiple: false,
    maxFiles: 1,
    maxSize: maxFileLimit,
  });
  // 因為沒辦法清空acceptedFiles(哪怕使用者先上傳後又不想要) 所以只能清掉URL表示使用者取消上傳圖片的意願
  const clearUploadedImage = () => {
    setImagePreviewURL(null);
  };

  if (!user) {
    throw Error("使用者未登入");
  }
  return (
    <div className="relative flex h-full w-full flex-col gap-4 px-4 py-4">
      <ConfirmModal
        className="top-[20%] h-max max-w-[300px]"
        isOpen={openDeleteModal}
        content={`確定要刪除該筆花費嗎?`}
        closeModal={closeDeleteModal}
        callback={handleDelete}
      />
      {/* header */}
      <header className="flex w-full items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <PreviousPageArrow
            onClick={() => navigate(`/home/group/${expense.groupID}`)}
          />
          <span className="w-[200px] truncate text-xl text-[var(--primary-font)]">
            {groupName}
          </span>
        </div>
        {!isGroupSettled && user.id === expense.creatorID && (
          <div className="ml-auto flex items-center justify-end gap-4">
            <FunctionButton
              disabled={isPending}
              onClick={() => setOpenDeleteModal(true)}
              className={`${isPending ? "pointer-events-none text-gray-400 grayscale-75" : ""} h-[40px] w-[65px] p-2 text-sm hover:bg-red-500 hover:text-white md:px-4 md:py-2 md:text-[16px]`}
            >
              {isPending ? <Spinner size={24} /> : "刪除"}
            </FunctionButton>
            <FunctionButton
              onClick={rollback}
              className={`p-2 text-sm md:px-4 md:py-2 md:text-[16px]`}
            >
              還原變更
            </FunctionButton>
          </div>
        )}
      </header>

      <h1 className="relative mb-1 flex flex-wrap items-center justify-between text-2xl font-bold break-words text-[var(--primary-font)]">
        {!isGroupSettled && user.id === expense.creatorID ? (
          <>
            <TextInput
              type="text"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              placeholder="花費名稱"
              className={`lg:w-[50%] ${expenseNameErrorMsg !== "" ? "border-2 border-red-500" : ""} text-black`}
            />
            {expenseNameErrorMsg !== "" && (
              <InputErrorMsg content={expenseNameErrorMsg} />
            )}
          </>
        ) : (
          <span className="flex w-[60%] flex-wrap items-center break-all">
            {expenseName}
          </span>
        )}
        <div className="mb-2 flex flex-1 flex-col items-end text-sm font-light md:gap-1 lg:mb-0">
          <span>{creatorName}</span>
          <span>上次編輯:&nbsp;2025/07/17</span>
        </div>
      </h1>
      <span className="relative h-[2px] w-full bg-black dark:bg-[var(--second-gray)]">
        <span className="invisible">placeholder</span>
        {!isGroupSettled ? (
          user.id === expense.creatorID && (
            <span className="absolute right-0 bottom-0 self-end text-sm font-bold text-[var(--third-blue)]">
              現為編輯模式
            </span>
          )
        ) : (
          <span className="absolute right-0 bottom-0 self-end text-sm font-bold text-red-500">
            現為唯獨模式
          </span>
        )}
      </span>
      {/* 填寫內容 */}
      <div className="md-lg:grid-cols-2 mt-4 grid w-full grid-cols-1">
        {/* 花費名稱/支出 */}
        <div className="flex flex-col gap-6">
          <div className="relative">
            <h2 className="mb-2 text-xl font-bold text-[var(--primary-font)] sm:text-2xl">
              實付款者
            </h2>
            {!isGroupSettled && user.id === expense.actualPayer ? (
              <Select
                options={users.map((user) => [user.userID, user.name])}
                value={actualPayerID}
                onChange={(e) => setActualPayer(e.target.value)}
                className="md-lg:w-[70%] w-[50%] rounded-lg bg-[var(--second-gray)] px-2 py-2"
              />
            ) : (
              <span className="block w-[80%] rounded-lg bg-[var(--second-gray)] px-2 py-2">
                {users.find((user) => user.userID === actualPayerID)!.name}
              </span>
            )}
          </div>
          <div className="relative">
            <h2 className="mb-2 text-xl font-bold text-[var(--primary-font)] sm:text-2xl">
              金額
            </h2>
            {!isGroupSettled && user.id === expense.creatorID ? (
              <>
                <TextInput
                  type="text"
                  placeholder="輸入金額"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    const val = e.currentTarget.value;
                    handleAmountChange(trimZero(val));
                  }}
                  className={`md-lg:w-[70%] w-[50%] ${amountErrorMsg !== "" ? "border-2 border-red-500" : ""}`}
                />
                {amountErrorMsg !== "" && (
                  <InputErrorMsg content={amountErrorMsg} />
                )}
              </>
            ) : (
              <span className="block w-[80%] rounded-lg bg-[var(--second-gray)] px-2 py-2">
                {amount}
              </span>
            )}
          </div>
          <div className="relative">
            <h2 className="mb-2 text-xl font-bold text-[var(--primary-font)] sm:text-2xl">
              幣別
            </h2>
            {!isGroupSettled && user.id === expense.creatorID ? (
              <Select
                name="currency"
                id="currency"
                options={currencyOptions}
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as (typeof CURRENCY)[number])
                }
                className="md-lg:w-[70%] w-[50%] rounded-lg bg-[var(--second-gray)] px-2 py-2"
              />
            ) : (
              <span className="block w-[80%] rounded-lg bg-[var(--second-gray)] px-2 py-2">
                {currency}
              </span>
            )}
          </div>
        </div>
        {/* 圖片區域 */}
        {!isGroupSettled && user.id === expense.creatorID ? (
          <div className="md-lg:mt-0 relative mt-4 flex h-full w-full flex-col items-center justify-center">
            <div
              className={`${isDragActive ? "border-3 border-blue-400" : "border-gray-500"} relative flex h-[400px] w-full max-w-[400px] border-2 border-dashed hover:cursor-pointer`}
              {...getRootProps()}
            >
              <input className="h-full w-full" {...getInputProps()} />
              {imagePreviewURL === null ? (
                fileRejections.length > 0 ? (
                  <p className="flex w-full items-center justify-center font-bold text-red-500">
                    {(() => {
                      const errorCode = fileRejections[0].errors[0].code;
                      switch (errorCode) {
                        case "file-invalid-type":
                          return "Only JPG, PNG images are allowed.";
                        case "file-too-large":
                          return "File is too large. Max size is 3MB.";
                        default:
                          return fileRejections[0].errors[0].message;
                      }
                    })()}
                  </p>
                ) : isDragActive ? (
                  <p className="flex w-full items-center justify-center font-bold">
                    Drop Here!!!
                  </p>
                ) : (
                  <p className="flex w-full items-center justify-center text-[var(--primary-font)]">
                    拖曳或點擊上傳圖片
                  </p>
                )
              ) : (
                /* resize image to 400px * 400px */
                <ImageDisplay
                  className="m-0 h-full w-full max-w-[400px] rounded-none"
                  imgClassName="object-fit max-w-[400px] h-full w-full rounded-none bg-no-repeat"
                  imageURL={imagePreviewURL}
                />
              )}
              {imagePreviewURL && (
                <div className="absolute top-full right-0 mt-2 flex items-center gap-2">
                  {acceptedFiles.length > 0 &&
                    imagePreviewURL !== oldImagePreviewURL && (
                      <span
                        title={acceptedFiles[0].name}
                        className="w-[100px] truncate text-[var(--primary-font)]"
                      >
                        {acceptedFiles[0].name}
                      </span>
                    )}
                  <FunctionButton
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearUploadedImage();
                    }}
                  >
                    移除上傳
                  </FunctionButton>
                </div>
              )}
            </div>
          </div>
        ) : (
          imagePreviewURL && (
            <div className="relative mt-4 flex h-full w-full flex-col items-center justify-center md:mt-0">
              <div
                className={`relative flex h-[400px] w-full max-w-[400px] border-2 border-dashed border-gray-500`}
              >
                <ImageDisplay
                  className="m-0 h-full w-full max-w-[400px] rounded-none"
                  imgClassName="object-fit max-w-[400px] h-full w-full rounded-none bg-no-repeat"
                  imageURL={imagePreviewURL}
                />
              </div>
            </div>
          )
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isGroupSettled && user.id === expense.creatorID ? (
          <>
            <span className="text-lg text-[var(--primary-font)]">
              是否平分?
            </span>
            <RadioButtonArea
              className="hover:cursor-pointer"
              options={radioButtonOptions}
              selected={split}
              onChangeCallback={(value: string) => setSplit(value === "true")}
            />
          </>
        ) : (
          split && (
            <div className="flex w-full items-center">
              <div className="flex-grow border-2 border-t border-dashed border-[var(--second-gray)]" />
              <span className="mx-4 text-xl font-bold whitespace-nowrap text-[var(--primary-font)]">
                {split ? "此花費平分" : ""}
              </span>
              <div className="flex-grow border-2 border-t border-dashed border-[var(--second-gray)]" />
            </div>
          )
        )}
      </div>

      {/* 實際應付款者區塊 */}
      <div className="flex w-full flex-col gap-4">
        {!split && (
          <span className="block h-[2px] w-full bg-black dark:bg-[var(--second-gray)]"></span>
        )}
        {!split && (
          <div
            className={`${split && user.id === expense.creatorID ? "pointer-events-none text-gray-400! grayscale-75!" : ""} pb-4`}
          >
            <h2
              className={`mb-4 ${split && user.id === expense.creatorID ? "text-gray-400" : "text-[var(--primary-font)]"} text-xl font-bold sm:text-2xl`}
            >
              應付款人
            </h2>

            {/* payer code blocks */}
            {/* 
            1. 非作者，且花費為平分，則資料由前端生成
            2. 作者，花費不管是否平分，皆會顯示後端儲存的payer，而能否編輯則由split決定
            3. 非作者，花費不是平分，則直接顯示後端儲存的payer
          */}
            {user.id !== expense.creatorID && split
              ? filteredUsers.map((filteredUser) => (
                  <div
                    key={filteredUser.id}
                    className="mb-4 flex flex-wrap items-center gap-2"
                  >
                    <span
                      title={filteredUser.name}
                      className="w-[100px] truncate rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm sm:px-2 sm:text-[16px] md:w-[200px]"
                    >
                      {filteredUser.name}
                    </span>
                    <span className={`text-[var(--primary-font)]`}>應付</span>
                    <span className="w-[100px] rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm text-[var(--primary-font)] sm:text-[16px] md:w-[120px]">
                      {parseFloat(amount) / filteredUsers.length}
                    </span>
                    <span className="w-[100px] rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm sm:w-[120px] sm:px-2 sm:text-[16px]">
                      {currency}
                    </span>
                  </div>
                ))
              : !split &&
                payers.map((payer, index) => (
                  <div
                    key={`payer-${index}`}
                    className="mb-4 flex flex-wrap items-center gap-2"
                  >
                    {!isGroupSettled && user.id === expense.creatorID ? (
                      <>
                        <Select
                          title={payer.name}
                          key={`payer-${payer.id}`}
                          options={filteredUsers.map((filteredUser) => [
                            filteredUser.userID,
                            filteredUser.name,
                          ])}
                          value={payer.userID}
                          onChange={(e) => {
                            handleUpdatePayer(index, e.target.value, "userID");
                            handleUpdatePayer(
                              index,
                              idToName[e.target.value],
                              "name",
                            );
                          }}
                          className="w-[100px] truncate rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm sm:px-2 sm:text-[16px] md:w-[200px]"
                        />
                        <span
                          className={`${split ? "text-gray-400" : "text-[var(--primary-font)]"}`}
                        >
                          應付
                        </span>
                        <TextInput
                          key={`amount-${index}`}
                          type="text"
                          placeholder="輸入金額"
                          value={payer.amount}
                          onChange={(e) => {
                            handleUpdatePayer(index, e.target.value, "amount");
                          }}
                          onCompositionStart={() => {
                            isComposingRef.current = true;
                          }}
                          onCompositionEnd={(e) => {
                            isComposingRef.current = false;
                            const val = e.currentTarget.value;
                            handleUpdatePayer(index, trimZero(val), "amount");
                          }}
                          className="w-[100px] text-sm sm:text-[16px] md:w-[120px]"
                        />
                        <span className="w-[100px] rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm sm:w-[120px] sm:px-2 sm:text-[16px]">
                          {currency}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePayer(index)}
                          className="ml-auto text-sm text-red-500 hover:cursor-pointer"
                        >
                          刪除
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          title={payer.name}
                          className="w-[100px] truncate rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm sm:px-2 sm:text-[16px] md:w-[200px]"
                        >
                          {payer.name}
                        </span>
                        <span className={`text-[var(--primary-font)]`}>
                          應付
                        </span>
                        <span className="w-[100px] rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm text-[var(--primary-font)] sm:text-[16px] md:w-[120px]">
                          {payer.amount}
                        </span>
                        <span className="w-[100px] rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm sm:w-[120px] sm:px-2 sm:text-[16px]">
                          {currency}
                        </span>
                      </>
                    )}
                  </div>
                ))}
            {!isGroupSettled && user.id === expense.creatorID && (
              <FunctionButton
                type="button"
                className="mt-4 flex w-max justify-center p-2 text-sm text-blue-500 hover:text-white hover:underline"
                onClick={handleAddPayer}
              >
                ＋新增應付款人
              </FunctionButton>
            )}
          </div>
        )}
        {/* 結算 */}
        <span className="block h-[2px] w-full bg-black dark:bg-[var(--second-gray)]"></span>
        <div className="flex flex-col gap-4">
          <h2
            className={`mb-4 text-xl font-bold text-[var(--primary-font)] sm:text-2xl`}
          >
            結算
          </h2>
          {parseFloat(amount) > 0 ? (
            settlement.map((settle, index) => (
              <div
                key={index}
                className="flex items-center gap-4 text-xl md:w-[70%] lg:w-[60%]"
              >
                <span
                  title={settle[0]}
                  className="w-[200px] truncate text-[var(--primary-font)]"
                >
                  {settle[0]}
                </span>
                <span
                  className={`ml-auto ${index === settlement.length - 1 ? "text-[var(--success-text)]" : "text-[var(--warn-text)]"}`}
                >
                  {index === settlement.length - 1 ? "+" : "-"}
                  {Math.floor(settle[1] * 10) / 10}
                </span>
                <span className="text-[var(--primary-font)]">{currency}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-500 dark:text-gray-300">
              尚無資料...
            </span>
          )}
        </div>
        {/* note area */}
        <span className="block h-[2px] w-full bg-black dark:bg-[var(--second-gray)]"></span>
        <div className="mb-2 flex flex-col gap-2">
          <h2 className="text-lg text-[var(--primary-font)] sm:text-xl">
            備註(最多350字)&nbsp;
            <span className="text-red-500">{noteErrorMsg}</span>
          </h2>
          {!isGroupSettled && user.id === expense.creatorID ? (
            <div
              ref={noteRef}
              suppressContentEditableWarning
              contentEditable
              className={`${noteErrorMsg !== "" ? "border-red-500" : "border-[var(--second-gray)]"} relative min-h-[150px] w-full rounded-lg border-2 p-2 text-[var(--primary-font)]`}
            >
              {oldNote}
            </div>
          ) : oldNote.length > 0 ? (
            <div
              className={`relative min-h-[150px] w-full rounded-lg border-2 border-[var(--second-gray)] p-2 text-[var(--primary-font)]`}
            >
              {oldNote}
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-300">
              目前尚無備註...
            </span>
          )}
        </div>
        {/* confirm button area */}
        {!isGroupSettled && user.id === expense.creatorID && (
          <div className="relative mb-4 flex items-center justify-end gap-4">
            {amountCheckErrorMsg !== "" ? (
              <InputErrorMsg
                className="relative top-0 left-0"
                content={amountCheckErrorMsg}
              />
            ) : (
              ""
            )}

            <FunctionButton
              onClick={() => {
                handleSubmit();
              }}
              className={`${isGroupSettled || isUpdatePending ? "pointer-events-none text-gray-400 grayscale-75" : ""} h-[40px] w-[100px] ${amountCheckErrorMsg !== "" ? "border-2 border-red-500" : ""}`}
              disabled={isGroupSettled || isUpdatePending}
            >
              {isUpdatePending ? <Spinner size={24} /> : "儲存變更"}
            </FunctionButton>
          </div>
        )}
      </div>
    </div>
  );
}
