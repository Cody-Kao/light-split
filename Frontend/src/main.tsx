import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { Router as AppRouter } from "./Router/Router.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginContextProvider } from "./context/LoginContextProvider.tsx";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ErrorBoundary } from "react-error-boundary";
import ErrorPage from "./components/Page/ErrorPage.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorPage}>
        <LoginContextProvider>
          <ReactQueryDevtools initialIsOpen={false} />
          <ErrorBoundary FallbackComponent={ErrorPage}>
            <RouterProvider router={AppRouter} />
          </ErrorBoundary>
        </LoginContextProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);
