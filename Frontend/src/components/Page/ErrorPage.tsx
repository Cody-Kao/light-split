import { Link } from "react-router";

export default function ErrorPage({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <h1 className="text-[45px] font-bold text-[var(--primary-font)] sm:text-[50px]">
        發生錯誤
      </h1>
      <span className="text-2xl font-bold text-[var(--primary-font)]">
        {error.message}
      </span>
      <Link className="text-blue-700 dark:text-blue-300" to={"/home"}>
        回首頁
      </Link>
    </div>
  );
}
