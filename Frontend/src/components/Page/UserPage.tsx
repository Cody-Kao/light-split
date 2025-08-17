import { useEffect, useRef, useState } from "react";
import FunctionButton from "../FunctionButton";
import ImageDisplay from "../ImageDisplay";
import { FaRegCircleUser } from "react-icons/fa6";
import ConfirmModal from "../Modal/ConfirmModal";
import { useChangeProfileImage, useLogout } from "../../Hooks/hooks";
import Spinner from "../Spinner";
import { showToast } from "../../utils/utils";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useNavigate } from "react-router";
import type {
  ChangeProfileImageRequest,
  LogoutRequest,
} from "../../type/request";
import { useQueryClient } from "@tanstack/react-query";
import { maxFileLimit } from "../../const/const";
import type { PostRequestResult } from "../../type/type";

export default function UserPage() {
  const { isChecking, user, logoutUser } = useLoginContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreviewURL, setImagePreviewURL] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState("");
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const readImageFile = () => {
    const file = inputRef?.current?.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (!file.type.startsWith("image/")) {
        console.warn("Only image files are allowed");
        return;
      }
      if (file.size > maxFileLimit) {
        alert("檔案過大，不得超過3MB");
        return;
      }
      setImagePreviewURL(URL.createObjectURL(file));
      setImageFileName(file.name);
    };

    reader.readAsDataURL(file);
  };

  const { mutate: uploadProfileImage, isPending: isUploading } =
    useChangeProfileImage();
  const handleUploadProfileImage = () => {
    if (!inputRef.current || !user) return;
    const data = new FormData();
    const request: ChangeProfileImageRequest = {
      userID: user.id,
    };
    data.append("request", JSON.stringify(request));
    const file = inputRef.current.files?.[0];
    if (!imagePreviewURL || !file) {
      console.warn("缺少使用者頭像; 無法上傳");
      return;
    }
    data.append("image", file);
    uploadProfileImage(data, {
      onSuccess: (res) => {
        if (res.type === "Logout") {
          logoutUser();
          navigate("/home/login");
        }
        if (res.type === "Error") {
          showToast(`變更頭像失敗: ${res.payload.message}`);
          return;
        }
        showToast("頭像變更成功！", true);
        queryClient.setQueriesData(
          { queryKey: ["checkLogin"] },
          (oldData: PostRequestResult) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              payload: {
                ...oldData.payload,
                data: {
                  ...oldData.payload.data,
                  image: res.payload.data.link,
                },
              },
            };
          },
        );
      },
    });
  };

  const { mutate, isPending } = useLogout();

  useEffect(() => {
    if (!isChecking && !user) {
      navigate("/home/login");
    }
  }, [user]);
  return (
    <div className="mt-[30%] flex h-full w-full flex-col items-center justify-start gap-2 md:mt-[15%]">
      <ConfirmModal
        className="top-[30%] max-w-[300px]"
        isOpen={openConfirmModal}
        content={"確定登出"}
        closeModal={() => setOpenConfirmModal(false)}
        callback={() => {
          const data: LogoutRequest = {
            userID: user!.id,
          };
          mutate(data, {
            onSuccess: (response) => {
              if (response.type === "Error") {
                showToast(`登出失敗: ${response.payload.message}`);
                return;
              }
              showToast("登出成功", true);
              queryClient.removeQueries({ queryKey: ["checkLogin"] });
              logoutUser();
              setTimeout(() => navigate("/home/login"), 500);
            },
          });
        }}
      />
      <label
        htmlFor="imageInput"
        className={`${isUploading ? "pointer-events-none" : "hover:cursor-pointer"} group relative w-[180px] rounded-full`}
      >
        <div className="absolute top-0 left-0 z-100 flex h-full w-full items-end justify-center rounded-full bg-black/70 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <span className="translate-y-[-100%] text-white hover:cursor-pointer">
            選擇圖片
            <input
              ref={inputRef}
              disabled={isUploading}
              onChange={readImageFile}
              className="hidden"
              id="imageInput"
              type="file"
              accept="image/png, image/jpg"
            />
          </span>
        </div>
        <ImageDisplay
          className="w-full border-2 border-black dark:border-gray-300"
          fallback={(props) => <FaRegCircleUser {...props} />}
          imageURL={imagePreviewURL ? imagePreviewURL : user?.image}
        />
      </label>
      {imagePreviewURL && (
        <div className="flex flex-col justify-center gap-2">
          <span className="text-center text-[var(--primary-font)]">
            {imageFileName}
          </span>
          <div className="flex justify-center gap-2">
            <FunctionButton
              disabled={isUploading}
              className={`${isUploading ? "pointer-events-none text-gray-400" : ""}`}
              onClick={() => setImagePreviewURL(null)}
            >
              取消
            </FunctionButton>
            <FunctionButton
              onClick={handleUploadProfileImage}
              disabled={isUploading}
              className={`w-[100px] ${isUploading ? "pointer-events-none text-gray-400" : ""}`}
            >
              {isUploading ? <Spinner size={20} /> : "確認更改"}
            </FunctionButton>
          </div>
        </div>
      )}
      <span className="text-2xl font-bold text-[var(--primary-font)]">
        {user?.name}
      </span>
      <span className="text-lg text-[var(--primary-font)] sm:text-xl">
        於{user?.createdAt}加入
      </span>
      <FunctionButton
        disabled={isPending}
        className="h-[40px] w-[65px]"
        onClick={() => setOpenConfirmModal(true)}
      >
        {isPending ? <Spinner size={24} /> : "登出"}
      </FunctionButton>
    </div>
  );
}
