import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export const Sparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
  const chartData = data.map((v, i) => ({ i, v }));
  const color = positive ? "hsl(var(--success))" : "hsl(var(--destructive))";
  const id = `spark-${positive ? "up" : "dn"}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          type="monotone"
          dataKey="v"
          stroke={`url(#${id})`}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
