import { useNavigate, useParams } from "react-router";
import PreviousPageArrow from "../PreviousPageArrow";
import FunctionButton from "../FunctionButton";
import TextInput from "../TextInput";
import { useEffect, useRef, useState } from "react";
import Select from "../Select";
import {
  currencyOptions,
  LessThan20Words,
  maxFileLimit,
  NonEmpty,
  OnlyAlphanumericChineseAndSpace,
  PositiveNumberOnly,
  currency as currencyType,
} from "../../const/const";
import RadioButtonArea from "../RadioButtonArea";
import type {
  TPayer,
  RadioOption,
  TGetJoinedMembersResponse,
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
import { useLocalStorage } from "../hooks/useLocalStorage";
import { v4 as uuid } from "uuid";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useCreateExpense } from "../../Hooks/hooks";
import type { CreateExpenseRequest } from "../../type/request";
import { useQueryClient } from "@tanstack/react-query";
import Spinner from "../Spinner";

const defaultPayer: TPayer = {
  id: "",
  userID: "",
  name: "",
  amount: 0,
};

const idToName: Record<string, string> = {};
const CURRENCY = ["台幣", "美金", "日幣"] as const;

const radioButtonOptions: RadioOption[] = [
  { label: "是", value: true },
  { label: "否", value: false },
];

export default function AddExpense({
  response,
}: {
  response: TGetJoinedMembersResponse;
}) {
  const { user, logoutUser } = useLoginContext();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useCreateExpense();
  const navigate = useNavigate();
  const params = useParams();
  const groupID = params["groupID"]!;
  const { groupName, members } = response;
  const isComposingRef = useRef(false);

  members.forEach(({ userID, name }) => {
    idToName[userID] = name;
  });
  const users: { id: string; name: string; userID: string }[] = members.map(
    (member) =>
      member.userID === user?.id
        ? { id: member.id, name: "你/妳", userID: member.userID }
        : member,
  );

  const [expenseName, setExpenseName, removeExpenseName] =
    useLocalStorage<string>(`lightSplit-${groupID}-expenseName`, "");
  const [expenseNameErrorMsg, setExpenseNameErrorMsg] = useState("");
  // 實際付款人
  const [actualPayerID, setActualPayer, removeActualPayer] =
    useLocalStorage<string>(
      `lightSplit-${groupID}-actualPayer`,
      user?.id ?? "",
    );
  const [amount, setAmount, removeAmount] = useLocalStorage<string>(
    `lightSplit-${groupID}-amount`,
    "0",
  );
  const [amountErrorMsg, setAmountErrorMsg] = useState("");
  const [currency, setCurrency, removeCurrency] = useLocalStorage<
    (typeof currencyType)[number]
  >(
    `lightSplit-${groupID}-currency`,
    currencyOptions[0][0] as (typeof currencyType)[number],
  );
  const [split, setSplit, removeSplit] = useLocalStorage<boolean>(
    `lightSplit-${groupID}-split`,
    true,
  );
  // image preview for image upload
  // 用這個state去表示使用者是否有上傳圖片，因為沒辦法清空acceptedFiles(哪怕使用者先上傳後又不想要)
  // 所以用URL是否為null去判斷
  const [imagePreviewURL, setImagePreviewURL] = useState<string | null>(null);

  // 付款人state array
  const [payers, setPayers, removePayers] = useLocalStorage<TPayer[]>(
    `lightSplit-${groupID}-payers`,
    [],
  );
  // 去除掉實際付款人，剩下的人才會是付款人的選項
  const filteredUsers = users.filter((user) => user.userID !== actualPayerID);

  const noteRef = useRef<HTMLDivElement | null>(null);
  const [oldNote, setOldNode, removeOldNote] = useLocalStorage(
    `lightSplit-${groupID}-oldNote`,
    "",
  );
  useEffect(() => {
    if (noteRef.current && oldNote) {
      noteRef.current.innerText = oldNote;
    }
  }, []);
  const [noteErrorMsg, setNoteErrorMsg] = useState("");

  // 最後送出的金額檢查errorMsg
  const [amountCheckErrorMsg, setAmountCheckErrorMsg] = useState("");

  if (!user) {
    navigate("/home/login");
  }

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

  const clearNote = () => {
    removeOldNote();
    if (noteRef.current) {
      noteRef.current.innerText = "";
    }
  };

  // 因為沒辦法清空acceptedFiles(哪怕使用者先上傳後又不想要) 所以只能清掉URL表示使用者取消上傳圖片的意願
  const clearUploadedImage = () => {
    setImagePreviewURL(null);
  };

  const removeRecord = () => {
    removeExpenseName();
    removeActualPayer();
    removeAmount();
    removeCurrency();
    removeSplit();
    removePayers();
    clearNote();
    clearUploadedImage();
  };

  const handleSubmit = () => {
    if (!user || !noteRef.current) return;
    if (!handleExpenseNameValidation()) return;
    if (!handleAmountValidation()) return;
    if (!handleAmountBalance()) return;
    if (!handleNoteWordLimit()) return;

    const data = new FormData();
    if (imagePreviewURL && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > maxFileLimit) {
        alert("檔案過大，不得超過3MB");
        return;
      }
      data.append("image", file);
    }
    const requestData: CreateExpenseRequest = {
      userID: user.id,
      groupID: groupID,
      expense: {
        name: expenseName,
        actualPayer: actualPayerID,
        amount: parseFloat(amount),
        creatorID: user.id,
        currency: currency,
        split: split,
        payers: payers.map((payer) => ({
          ...payer,
          amount: Math.floor(parseFloat(payer.amount.toString()) * 10) / 10,
        })),
        note: noteRef.current.innerText,
      },
    };
    console.log(requestData);
    data.append("request", JSON.stringify(requestData));
    mutate(data, {
      onSuccess: (res) => {
        if (res.type === "Logout") {
          logoutUser();
          navigate("/home/login");
        }
        if (res.type === "Error") {
          showToast(`新增花費失敗: ${res.payload.message}`);
          return;
        }
        showToast("花費新增成功！", true);
        queryClient.invalidateQueries({ queryKey: ["paginatedExpenses"] });
        removeRecord();
        navigate(`/home/group/${groupID}/expense/${res.payload.data}`);
      },
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Do something with the files
    if (acceptedFiles.length > 0) {
      setImagePreviewURL(URL.createObjectURL(acceptedFiles[0]));
    }
  }, []);
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

  if (!user) {
    throw Error("使用者未登入");
  }

  return (
    <div className="relative flex h-full w-full flex-col gap-4 px-4 py-4">
      {/* header */}
      <header className="flex w-full items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <PreviousPageArrow
            onClick={() => navigate(`/home/group/${groupID}`)}
          />
          <span className="w-[200px] truncate text-xl text-[var(--primary-font)]">
            {groupName}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <FunctionButton
            onClick={removeRecord}
            className="hover:bg-red-500 hover:text-white"
          >
            清除
          </FunctionButton>
        </div>
      </header>
      <h1 className="text-3xl font-bold text-[var(--primary-font)]">
        新增花費
      </h1>
      <span className="h-[2px] w-full bg-black dark:bg-[var(--second-gray)]">
        <span className="invisible">placeholder</span>
      </span>
      {members.length > 1 ? (
        <>
          {/* 填寫內容 */}
          <div className="md-lg:grid-cols-2 mt-4 grid w-full grid-cols-1">
            {/* 花費名稱/支出 */}
            <div className="flex flex-col gap-6">
              <div className="relative">
                <h2 className="mb-2 text-xl font-bold text-[var(--primary-font)] sm:text-2xl">
                  花費名稱
                </h2>
                <TextInput
                  type="text"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="花費名稱"
                  className={`md-lg:w-[75%] w-[50%] rounded-lg bg-[var(--second-gray)] px-2 py-2 ${expenseNameErrorMsg !== "" ? "border-2 border-red-500" : ""}`}
                />
                {expenseNameErrorMsg !== "" && (
                  <InputErrorMsg content={expenseNameErrorMsg} />
                )}
              </div>
              <div className="relative">
                <h2 className="mb-2 text-xl font-bold text-[var(--primary-font)] sm:text-2xl">
                  實付款者
                </h2>
                <Select
                  options={users.map((user) => [user.userID, user.name])}
                  value={actualPayerID}
                  onChange={(e) => setActualPayer(e.target.value)}
                  className="md-lg:w-[70%] w-[50%] rounded-lg bg-[var(--second-gray)] px-2 py-2"
                />
              </div>
              <div className="relative">
                <h2 className="mb-2 text-xl font-bold text-[var(--primary-font)] sm:text-2xl">
                  金額
                </h2>
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
              </div>
              <div className="relative">
                <h2 className="mb-2 text-xl font-bold text-[var(--primary-font)] sm:text-2xl">
                  幣別
                </h2>
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
              </div>
            </div>
            {/* 圖片區域 */}
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
                  <img
                    className="object-fit h-full w-full bg-no-repeat"
                    src={imagePreviewURL}
                    alt="image-preview"
                  />
                )}
                {imagePreviewURL && (
                  <div className="absolute top-full right-0 mt-2 flex items-center gap-2">
                    {acceptedFiles.length > 0 && (
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg text-[var(--primary-font)]">
              是否平分?
            </span>
            <RadioButtonArea
              className="hover:cursor-pointer"
              options={radioButtonOptions}
              selected={split}
              onChangeCallback={(value: string) => setSplit(value === "true")}
            />
          </div>

          {/* 實際應付款者區塊 */}
          <div className="flex w-full flex-col gap-4">
            <span className="block h-[2px] w-full bg-black dark:bg-[var(--second-gray)]"></span>
            <div
              className={`${split ? "pointer-events-none text-gray-400! grayscale-75!" : ""} pb-4`}
            >
              <h2
                className={`mb-4 ${split ? "text-gray-400" : "text-[var(--primary-font)]"} text-xl font-bold sm:text-2xl`}
              >
                應付款人
              </h2>
              {/* payer code blocks */}
              {payers.map((payer, index) => (
                <div
                  key={`payer-${index}`}
                  className="mb-4 flex flex-wrap items-center gap-2"
                >
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
                    className="w-[100px] rounded-lg bg-[var(--second-gray)] px-1 py-2 text-sm sm:w-[120px] sm:px-2 sm:text-[16px]"
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
                </div>
              ))}

              <FunctionButton
                type="button"
                className="mt-4 flex w-max justify-center p-2 text-sm text-blue-500 hover:text-white hover:underline"
                onClick={handleAddPayer}
              >
                ＋新增應付款人
              </FunctionButton>
            </div>
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
                    <span className="text-[var(--primary-font)]">
                      {currency}
                    </span>
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
            <div className="flex flex-col gap-2">
              <h2 className="text-lg text-[var(--primary-font)] sm:text-xl">
                備註(最多350字)&nbsp;
                <span className="text-red-500">{noteErrorMsg}</span>
              </h2>
              <div
                ref={noteRef}
                contentEditable
                onInput={() => setOldNode(noteRef.current?.innerText ?? "")}
                className={`${noteErrorMsg !== "" ? "border-red-500" : "border-[var(--second-gray)]"} relative min-h-[150px] w-full rounded-lg border-2 p-2 text-[var(--primary-font)]`}
              ></div>
              <span className="text-gray-500 dark:text-gray-300">
                任何想留言的
              </span>
            </div>
            {/* confirm button area */}
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
                className={`${isPending ? "pointer-events-none bg-gray-400 grayscale-75" : ""} h-[40px] w-[80px] ${amountCheckErrorMsg !== "" ? "border-2 border-red-500" : ""}`}
                disabled={isPending}
              >
                {isPending ? <Spinner size={24} /> : "確定"}
              </FunctionButton>
            </div>
          </div>
        </>
      ) : (
        <h2 className="text-xl font-bold text-[var(--primary-font)]">
          需等待更多成員加入...
        </h2>
      )}
    </div>
  );
}
