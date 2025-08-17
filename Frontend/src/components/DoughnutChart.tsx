import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import annotationPlugin from "chartjs-plugin-annotation";
import { Doughnut } from "react-chartjs-2";
import type { AggregatedPayment } from "../type/type";
import { colors } from "../const/const";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels,
  annotationPlugin,
);

export default function DoughnutChart({
  payments,
}: {
  payments: AggregatedPayment[];
}) {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const labels = payments.map(
    (payment) => `${payment.payerName} -> ${payment.receiverName}`,
  );

  const data = {
    labels,
    datasets: [
      {
        label: "花費總額",
        data: payments.map((p) => p.amount),
        backgroundColor: colors,
        hoverOffset: 4,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    plugins: {
      datalabels: {
        color: "#000",
        formatter: (value) => {
          const percentage = ((value / totalAmount) * 100).toFixed(1);
          return `${percentage}%`;
        },
        font: {
          weight: "bold",
          size: 14,
        },
      },
      legend: {
        position: "bottom",
      },
      annotation: {
        // @ts-ignore
        annotations: {
          dLabel: {
            type: "doughnutLabel",
            // @ts-ignore
            content: ({ chart }) => ["總結算", chart.getDatasetMeta(0).total],
            font: [{ size: 25 }, { size: 20 }],
            color: ["black", "red"],
          },
        },
      },
    },
  };

  return <Doughnut data={data} options={options} />;
}
