import { ClipLoader } from "react-spinners";

export default function Spinner({
  size,
  color,
}: {
  size: number;
  color?: string;
}) {
  return <ClipLoader color={color} size={size} />;
}
