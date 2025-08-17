import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, UserSchema } from "../../Schema/schema";
import type { TLogin, TUser } from "../../type/type";
import InputErrorMsg from "../InputErrorMsg";
import type { LoginRequest } from "../../type/request";
import { useLogin } from "../../Hooks/hooks";
import { showToast } from "../../utils/utils";
import Spinner from "../Spinner";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useNavigate } from "react-router";

export default function Login() {
  const { loginUser } = useLoginContext();
  const navigate = useNavigate();
  const mutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TLogin>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = (formValues: FieldValues) => {
    const data: LoginRequest = {
      account: formValues["account"],
      password: formValues["password"],
    };
    mutation.mutate(
      { data, schema: UserSchema },
      {
        onSuccess(response) {
          if (response.type === "Error") {
            const { field, message } = response.payload;
            setError((field as keyof TLogin) ?? "root", { message });
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
          placeholder="密碼"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 dark:border-gray-500"
        />
        {errors.password && (
          <InputErrorMsg content={errors.password.message || "輸入格式錯誤"} />
        )}
      </div>
      <div className="relative w-full">
        <button
          type="submit"
          className={`${mutation.isPending ? "pointer-events-auto bg-gray-400 grayscale-75" : "hover:cursor-pointer"} mt-4 h-[40px] w-[65px] rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:cursor-pointer hover:bg-blue-700`}
        >
          {mutation.isPending ? <Spinner size={24} /> : "登入"}
        </button>
        {errors.root && (
          <InputErrorMsg content={errors.root.message || "輸入格式錯誤"} />
        )}
      </div>
    </form>
  );
}
