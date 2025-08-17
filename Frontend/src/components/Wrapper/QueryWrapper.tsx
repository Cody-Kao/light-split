import { Suspense, useEffect, type ReactElement } from "react";
import Skeleton from "../Skeleton";
import { useLoginContext } from "../../context/LoginContextProvider";
import { useNavigate } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import ErrorPage from "../Page/ErrorPage";

export default function QueryWrapper({
  children,
}: {
  children: ReactElement | ReactElement[];
}) {
  const { isChecking, user } = useLoginContext();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isChecking && !user) {
      navigate("/home/login");
    }
  }, [user]);
  if (isChecking) {
    return <Skeleton />;
  }
  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Suspense fallback={<Skeleton />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
