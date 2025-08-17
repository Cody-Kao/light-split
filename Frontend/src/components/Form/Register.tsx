import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputErrorMsg from "../InputErrorMsg";
import type { TRegister, TUser } from "../../type/type";
import { RegisterSchema, UserSchema } from "../../Schema/schema";
import { useRegister } from "../../Hooks/hooks";
import type { RegisterRequest } from "../../type/request";
import { showToast } from "../../utils/utils";
import Spinner from "../Spinner";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useNavigate } from "react-router-dom";
export default function Register() {
  const { loginUser } = useLoginContext();
  const navigate = useNavigate();
  const mutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TRegister>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = (formValues: FieldValues) => {
    const data: RegisterRequest = {
      name: formValues["name"],
      account: formValues["account"],
      password: formValues["password"],
      confirmPassword: formValues["confirmPassword"],
    };
    mutation.mutate(
      { data, schema: UserSchema },
      {
        onSuccess: (response) => {
          if (response.type === "Error") {
            const { field, message } = response.payload;
            setError((field as keyof TRegister) ?? "root", { message });
          } else {
            showToast(response.payload.message, true);
            loginUser(response.payload.data as TUser);
            navigate("/home");
          }
        },
      },
    );
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="relative w-full">
        <input
          {...register("name")}
          placeholder="使用者名稱"
          autoComplete="username"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 dark:border-gray-500"
        />
        {errors.name && (
          <InputErrorMsg content={errors.name.message || "輸入格式錯誤"} />
        )}
      </div>
      <div className="relative w-full">
        <input
          {...register("account")}
          placeholder="電子郵件帳號"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 dark:border-gray-500"
        />
        {errors.account && (
          <InputErrorMsg content={errors.account.message || "輸入格式錯誤"} />
        )}
      </div>
      <div className="relative w-full">
        <input
          {...register("password")}
          type="password"
          placeholder="請輸入密碼"
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 dark:border-gray-500"
        />
        {errors.password && (
          <InputErrorMsg content={errors.password.message || "輸入格式錯誤"} />
        )}
      </div>
      <div className="relative w-full">
        <input
          {...register("confirmPassword")}
          type="password"
          placeholder="請再次輸入密碼"
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 dark:border-gray-500"
        />
        {errors.confirmPassword && (
          <InputErrorMsg
            content={errors.confirmPassword.message || "輸入格式錯誤"}
          />
        )}
      </div>
      <div className="relative w-full">
        <button
          type="submit"
          className={`${mutation.isPending ? "pointer-events-auto bg-gray-400 grayscale-75" : "hover:cursor-pointer"} mt-4 h-[40px] w-[65px] rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:cursor-pointer hover:bg-green-700`}
        >
          {mutation.isPending ? <Spinner size={24} /> : "註冊"}
        </button>
        {errors.root && (
          <InputErrorMsg content={errors.root.message || "輸入格式錯誤"} />
        )}
      </div>
    </form>
  );
}
