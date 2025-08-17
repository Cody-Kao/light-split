import type { JSX, ComponentProps } from "react";
import type { IconBaseProps } from "react-icons";
import { cn } from "../utils/utils";
import { useState } from "react";
import Spinner from "./Spinner";

type ImageDisplayProps = {
  fallback?: (props: IconBaseProps) => JSX.Element;
  imageURL?: string;
  imgClassName?: string;
} & ComponentProps<"div">;

export default function ImageDisplay({
  fallback,
  imageURL,
  className,
  imgClassName,
  ...props
}: ImageDisplayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  return (
    <div
      className={cn(
        "relative mr-2 flex aspect-square w-[40px] items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      {imageURL && !isError ? (
        <>
          {isLoading && <Spinner size={36} />}
          <img
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              imgClassName,
              isLoading ? "opacity-0" : "opacity-100",
            )}
            src={imageURL}
            alt="profile picture"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setIsError(true);
            }}
            loading="lazy"
          />
        </>
      ) : fallback ? (
        fallback({
          className: "w-full h-full object-cover bg-cover dark:text-white",
        })
      ) : null}
    </div>
  );
}
