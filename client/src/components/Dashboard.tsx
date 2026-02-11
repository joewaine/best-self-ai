import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn, formatDuration, formatTime, formatShortDate } from "../lib/utils";

type DashboardData = {
  date: string;
  sleep: { score: number | null; contributors: Record<string, number> | null };
  readiness: { score: number | null; contributors: Record<string, number> | null };
  activity: {
    score: number | null;
    steps: number | null;
    activeCalories: number | null;
    totalCalories: number | null;
    contributors: Record<string, number> | null;
  };
  stress: {
    stressHigh: number | null;
    recoveryHigh: number | null;
    summary: string | null;
  };
  spo2: { average: number | null };
  heartRate: { samples: { bpm: number; time: string }[]; latest: number | null };
  sleepDetails: {
    bedtimeStart: string | null;
    bedtimeEnd: string | null;
    totalSleep: number | null;
    deepSleep: number | null;
    remSleep: number | null;
    lightSleep: number | null;
    awakeTime: number | null;
    avgHr: number | null;
    lowestHr: number | null;
    avgHrv: number | null;
    efficiency: number | null;
  } | null;
};

type WeekData = {
  startDate: string;
  endDate: string;
  sleep: { day: string; score: number | null }[];
  readiness: { day: string; score: number | null }[];
  activity: { day: string; score: number | null; steps: number | null; activeCalories: number | null }[];
  sleepDetails: {
    day: string;
    avgHrv: number | null;
    avgHr: number | null;
    totalSleep: number | null;
    deepSleep: number | null;
    remSleep: number | null;
  }[];
};

function ScoreRing({
  score,
  label,
  color,
  size = 120,
}: {
  score: number | null;
  label: string;
  color: string;
  size?: number;
}) {
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-secondary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {score ?? "--"}
          </span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function StatItem({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-xl font-semibold" style={color ? { color } : undefined}>
        {value ?? "--"}
        {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function SleepStageBar({ sleepDetails }: { sleepDetails: DashboardData["sleepDetails"] }) {
  if (!sleepDetails) return null;

  const stages = [
    { name: "Deep", value: sleepDetails.deepSleep, color: "var(--color-chart-1)" },
    { name: "REM", value: sleepDetails.remSleep, color: "var(--color-chart-4)" },
    { name: "Light", value: sleepDetails.lightSleep, color: "var(--color-chart-2)" },
    { name: "Awake", value: sleepDetails.awakeTime, color: "var(--color-destructive)" },
  ].filter((s) => s.value !== null);

  const total = stages.reduce((sum, s) => sum + (s.value ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden">
        {stages.map((stage) => (
          <div
            key={stage.name}
            style={{
              width: `${((stage.value ?? 0) / total) * 100}%`,
              backgroundColor: stage.color,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        {stages.map((stage) => (
          <div key={stage.name} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-muted-foreground">
              {stage.name}: {formatDuration(stage.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeartRateChart({ samples }: { samples: { bpm: number; time: string }[] }) {
  if (samples.length === 0) {
    return <div className="text-muted-foreground text-center py-8">No heart rate data</div>;
  }

  const data = samples.map((s) => ({
    time: new Date(s.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    bpm: s.bpm,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-hr)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-hr)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={["dataMin - 5", "dataMax + 5"]}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "var(--color-foreground)" }}
        />
        <Area
          type="monotone"
          dataKey="bpm"
          stroke="var(--color-hr)"
          fill="url(#hrGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function WeeklyTrendChart({ data, title }: { data: WeekData; title: string }) {
  const chartData = data.sleep.map((s, i) => ({
    day: formatShortDate(s.day).split(",")[0],
    sleep: s.score,
    readiness: data.readiness[i]?.score,
    activity: data.activity[i]?.score,
  }));

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="sleep"
            stroke="var(--color-sleep)"
            strokeWidth={2}
            dot={{ fill: "var(--color-sleep)", strokeWidth: 0, r: 3 }}
            name="Sleep"
          />
          <Line
            type="monotone"
            dataKey="readiness"
            stroke="var(--color-readiness)"
            strokeWidth={2}
            dot={{ fill: "var(--color-readiness)", strokeWidth: 0, r: 3 }}
            name="Readiness"
          />
          <Line
            type="monotone"
            dataKey="activity"
            stroke="var(--color-activity)"
            strokeWidth={2}
            dot={{ fill: "var(--color-activity)", strokeWidth: 0, r: 3 }}
            name="Activity"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-sleep" />
          <span className="text-muted-foreground">Sleep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-readiness" />
          <span className="text-muted-foreground">Readiness</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-activity" />
          <span className="text-muted-foreground">Activity</span>
        </div>
      </div>
    </div>
  );
}

function StepsChart({ data }: { data: WeekData }) {
  const chartData = data.activity.map((a) => ({
    day: formatShortDate(a.day).split(",")[0],
    steps: a.steps ?? 0,
    calories: a.activeCalories ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="steps" fill="var(--color-activity)" radius={[4, 4, 0, 0]} name="Steps" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function HrvChart({ data }: { data: WeekData }) {
  const chartData = data.sleepDetails.map((s) => ({
    day: formatShortDate(s.day).split(",")[0],
    hrv: s.avgHrv ?? 0,
    hr: s.avgHr ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
          }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="hrv"
          stroke="var(--color-hrv)"
          strokeWidth={2}
          dot={{ fill: "var(--color-hrv)", strokeWidth: 0, r: 3 }}
          name="HRV (ms)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="hr"
          stroke="var(--color-hr)"
          strokeWidth={2}
          dot={{ fill: "var(--color-hr)", strokeWidth: 0, r: 3 }}
          name="Avg HR (bpm)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function StressRecoveryDonut({ stress }: { stress: DashboardData["stress"] }) {
  if (stress.stressHigh === null && stress.recoveryHigh === null) {
    return <div className="text-muted-foreground text-center py-4">No stress data</div>;
  }

  const data = [
    { name: "Stress", value: stress.stressHigh ?? 0, color: "var(--color-stress)" },
    { name: "Recovery", value: stress.recoveryHigh ?? 0, color: "var(--color-recovery)" },
  ];

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={100} height={100}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={30}
            outerRadius={45}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-stress" />
          <span className="text-sm text-muted-foreground">
            Stress: {stress.stressHigh ?? 0} min
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-recovery" />
          <span className="text-sm text-muted-foreground">
            Recovery: {stress.recoveryHigh ?? 0} min
          </span>
        </div>
        {stress.summary && (
          <span className="text-xs text-muted-foreground capitalize">{stress.summary}</span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ userName }: { userName?: string }) {
  const [todayData, setTodayData] = useState<DashboardData | null>(null);
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [todayRes, weekRes] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/today`, { credentials: "include" }),
          fetch(`${API_BASE}/api/dashboard/week`, { credentials: "include" }),
        ]);

        if (!todayRes.ok || !weekRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [today, week] = await Promise.all([todayRes.json(), weekRes.json()]);
        setTodayData(today);
        setWeekData(week);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading your health data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (!todayData || !weekData) return null;

  const today = new Date(todayData.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Good Morning{userName ? `, ${userName}` : ""}</h1>
            <p className="text-muted-foreground mt-1">{today}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Synced with Oura
          </div>
        </div>

        {/* Main Scores */}
        <Card>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <ScoreRing
              score={todayData.sleep.score}
              label="Sleep"
              color="var(--color-sleep)"
              size={140}
            />
            <ScoreRing
              score={todayData.readiness.score}
              label="Readiness"
              color="var(--color-readiness)"
              size={140}
            />
            <ScoreRing
              score={todayData.activity.score}
              label="Activity"
              color="var(--color-activity)"
              size={140}
            />
          </div>
        </Card>

        {/* Sleep & Vitals Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sleep Details */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Last Night's Sleep</h2>
            {todayData.sleepDetails ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatItem
                    label="Total Sleep"
                    value={formatDuration(todayData.sleepDetails.totalSleep)}
                  />
                  <StatItem
                    label="Efficiency"
                    value={todayData.sleepDetails.efficiency}
                    unit="%"
                  />
                  <StatItem
                    label="Bedtime"
                    value={formatTime(todayData.sleepDetails.bedtimeStart)}
                  />
                  <StatItem
                    label="Wake Time"
                    value={formatTime(todayData.sleepDetails.bedtimeEnd)}
                  />
                </div>
                <SleepStageBar sleepDetails={todayData.sleepDetails} />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <StatItem
                    label="Avg HRV"
                    value={todayData.sleepDetails.avgHrv}
                    unit="ms"
                    color="var(--color-hrv)"
                  />
                  <StatItem
                    label="Avg HR"
                    value={todayData.sleepDetails.avgHr}
                    unit="bpm"
                    color="var(--color-hr)"
                  />
                  <StatItem
                    label="Lowest HR"
                    value={todayData.sleepDetails.lowestHr}
                    unit="bpm"
                  />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No sleep data available</p>
            )}
          </Card>

          {/* Heart Rate Today */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Heart Rate Today</h2>
              {todayData.heartRate.latest && (
                <span className="text-2xl font-bold text-hr">
                  {todayData.heartRate.latest} <span className="text-sm font-normal">bpm</span>
                </span>
              )}
            </div>
            <HeartRateChart samples={todayData.heartRate.samples} />
          </Card>
        </div>

        {/* Activity & Stress Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Activity Stats */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Activity</h2>
            <div className="space-y-4">
              <StatItem
                label="Steps"
                value={todayData.activity.steps !== null ? todayData.activity.steps.toLocaleString() : null}
                color="var(--color-activity)"
              />
              <StatItem
                label="Active Calories"
                value={todayData.activity.activeCalories}
                unit="cal"
              />
              <StatItem
                label="Total Calories"
                value={todayData.activity.totalCalories}
                unit="cal"
              />
            </div>
          </Card>

          {/* Stress & Recovery */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Stress & Recovery</h2>
            <StressRecoveryDonut stress={todayData.stress} />
          </Card>

          {/* Blood Oxygen */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Blood Oxygen</h2>
            <div className="flex items-center justify-center h-24">
              <div className="text-center">
                <span className="text-4xl font-bold text-primary">
                  {todayData.spo2.average ?? "--"}
                </span>
                <span className="text-lg text-muted-foreground ml-1">%</span>
                <p className="text-sm text-muted-foreground mt-1">SpO2 Average</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Weekly Trends */}
        <Card>
          <h2 className="text-lg font-semibold mb-6">7-Day Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <WeeklyTrendChart data={weekData} title="Score Trends" />
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Daily Steps</h3>
              <StepsChart data={weekData} />
            </div>
          </div>
        </Card>

        {/* HRV & HR Trends */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">HRV & Heart Rate Trends</h2>
          <HrvChart data={weekData} />
          <div className="flex justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-hrv" />
              <span className="text-muted-foreground">HRV (ms)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-hr" />
              <span className="text-muted-foreground">Avg Heart Rate (bpm)</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
