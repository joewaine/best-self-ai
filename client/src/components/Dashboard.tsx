// Main dashboard - shows health metrics from Oura ring data

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

// Map a 0-100 score to a status label and color class
function getScoreStatus(score: number | null): { text: string; className: string } {
  if (score === null) return { text: "", className: "" };
  if (score >= 85) return { text: "OPTIMAL", className: "status-good" };
  if (score >= 70) return { text: "GOOD", className: "status-good" };
  if (score >= 50) return { text: "FAIR", className: "status-fair" };
  return { text: "NEEDS ATTENTION", className: "status-attention" };
}

// Small score display used in the top bar
function ScoreChip({
  icon,
  score,
  label,
}: {
  icon: React.ReactNode;
  score: number | null;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-base sm:text-lg font-light">{score ?? "--"}</span>
      </div>
      <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// Icons
function ReadinessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  );
}

function SleepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function StepsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 16l4-4-4-4M8 20l4-4-4-4M12 4l4 4-4 4M16 8l4 4-4 4"/>
    </svg>
  );
}

function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  );
}

function SunriseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M4.93 19.07l1.41-1.41M12 18a6 6 0 0 0 0-12M22 12h-2M19.07 4.93l-1.41 1.41M19.07 19.07l-1.41-1.41M22 18H2"/>
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 16h5v5"/>
    </svg>
  );
}

// Circular progress indicator for main scores (readiness, sleep, activity)
function ScoreArc({
  score,
  label,
  status,
  color,
  size = 160,
}: {
  score: number | null;
  label: string;
  status: string;
  color: string;
  size?: number;
}) {
  const strokeWidth = size < 100 ? 6 : 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;
  const fontSize = size < 100 ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-secondary)"
            strokeWidth={strokeWidth}
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
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(fontSize, "font-light tracking-tight")} style={{ color }}>
            {score ?? "--"}
          </span>
        </div>
      </div>
      <div className="mt-2 sm:mt-3 text-center">
        <div className="text-xs sm:text-sm font-light text-muted-foreground">{label}</div>
        {status && (
          <div className={cn("mt-0.5 sm:mt-1 text-[10px] sm:text-xs", getScoreStatus(score).className)}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable card wrapper with consistent styling
function Card({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-4 md:p-5",
        hover && "card-hover cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

// Card for showing a single metric like calories or blood oxygen
function MetricCard({
  icon,
  label,
  value,
  unit,
  status,
  statusClass,
  subtitle,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number | null;
  unit?: string;
  status?: string;
  statusClass?: string;
  subtitle?: string;
}) {
  return (
    <Card hover>
      <div className="flex items-start gap-2 sm:gap-3">
        {icon && (
          <div className="p-1.5 sm:p-2 rounded-full bg-secondary text-muted-foreground">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground truncate">{label}</span>
            {status && <span className={cn("shrink-0", statusClass)}>{status}</span>}
          </div>
          <div className="mt-0.5 sm:mt-1">
            <span className="text-2xl sm:text-3xl font-light">{value ?? "--"}</span>
            {unit && <span className="text-sm sm:text-lg text-muted-foreground ml-1">{unit}</span>}
          </div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// Horizontal bar showing sleep stage breakdown (deep, REM, light, awake)
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
      <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
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
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {stages.map((stage) => (
          <div key={stage.name} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-muted-foreground">
              {stage.name} {formatDuration(stage.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Line chart showing heart rate over time
function HeartRateChart({ samples, latest }: { samples: { bpm: number; time: string }[]; latest: number | null }) {
  if (samples.length === 0) {
    return <div className="text-muted-foreground text-center py-8">No heart rate data</div>;
  }

  const data = samples.map((s) => ({
    time: new Date(s.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    bpm: s.bpm,
  }));

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-light">{latest ?? "--"}</span>
        <span className="text-muted-foreground">bpm</span>
        <span className="text-xs text-muted-foreground ml-auto">now</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-hr)" stopOpacity={0.2} />
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
            domain={["dataMin - 10", "dataMax + 10"]}
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
              color: "var(--color-foreground)",
            }}
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
    </div>
  );
}

// Single event in the day timeline (wake up, fall asleep, etc)
function TimelineEvent({
  icon,
  time,
  title,
  details,
}: {
  icon: React.ReactNode;
  time: string;
  title: string;
  details?: { icon?: React.ReactNode; text: string }[];
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="p-2 rounded-full bg-secondary text-muted-foreground">
          {icon}
        </div>
        <div className="w-px flex-1 bg-border mt-2" />
      </div>
      <div className="flex-1 pb-6">
        <div className="text-xs text-muted-foreground">{time}</div>
        <Card className="mt-2">
          <div className="font-light">{title}</div>
          {details && (
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {details.map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  {d.icon}
                  <span>{d.text}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Line chart showing 7-day trends for sleep, readiness, and activity scores
function WeeklyTrendChart({ data }: { data: WeekData }) {
  const chartData = data.sleep.map((s, i) => ({
    day: formatShortDate(s.day).split(",")[0],
    sleep: s.score,
    readiness: data.readiness[i]?.score,
    activity: data.activity[i]?.score,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
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
              color: "var(--color-foreground)",
            }}
          />
          <Line
            type="monotone"
            dataKey="sleep"
            stroke="var(--color-sleep)"
            strokeWidth={2}
            dot={{ fill: "var(--color-sleep)", strokeWidth: 0, r: 4 }}
            name="Sleep"
          />
          <Line
            type="monotone"
            dataKey="readiness"
            stroke="var(--color-readiness)"
            strokeWidth={2}
            dot={{ fill: "var(--color-readiness)", strokeWidth: 0, r: 4 }}
            name="Readiness"
          />
          <Line
            type="monotone"
            dataKey="activity"
            stroke="var(--color-activity)"
            strokeWidth={2}
            dot={{ fill: "var(--color-activity)", strokeWidth: 0, r: 4 }}
            name="Activity"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-sleep)" }} />
          <span className="text-muted-foreground">Sleep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-readiness)" }} />
          <span className="text-muted-foreground">Readiness</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-activity)" }} />
          <span className="text-muted-foreground">Activity</span>
        </div>
      </div>
    </div>
  );
}

// Bar chart showing daily steps for the week
function StepsChart({ data }: { data: WeekData }) {
  const chartData = data.activity.map((a) => ({
    day: formatShortDate(a.day).split(",")[0],
    steps: a.steps ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={140}>
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
            color: "var(--color-foreground)",
          }}
        />
        <Bar dataKey="steps" fill="var(--color-activity)" radius={[4, 4, 0, 0]} name="Steps" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Line chart for HRV (heart rate variability) over the week
function HrvTrendChart({ data }: { data: WeekData }) {
  const chartData = data.sleepDetails.map((s) => ({
    day: formatShortDate(s.day).split(",")[0],
    hrv: s.avgHrv ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={chartData}>
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
          width={30}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            color: "var(--color-foreground)",
          }}
        />
        <Line
          type="monotone"
          dataKey="hrv"
          stroke="var(--color-hrv)"
          strokeWidth={2}
          dot={{ fill: "var(--color-hrv)", strokeWidth: 0, r: 4 }}
          name="HRV (ms)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Donut chart comparing stress vs recovery time
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
      <ResponsiveContainer width={80} height={80}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={25}
            outerRadius={38}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-recovery)" }} />
          <span className="text-muted-foreground">
            Recovery: {stress.recoveryHigh ?? 0}m
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-stress)" }} />
          <span className="text-muted-foreground">
            Stress: {stress.stressHigh ?? 0}m
          </span>
        </div>
      </div>
    </div>
  );
}

// Personalized health tip based on today's data
function HealthInsight({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 border border-border">
      <h3 className="text-base sm:text-lg font-light mb-1.5 sm:mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export default function Dashboard({ userName }: { userName?: string }) {
  const [todayData, setTodayData] = useState<DashboardData | null>(null);
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load both today's data and 7-day history in parallel
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
      setSyncing(false);
    }
  }

  // Clear server cache and refetch fresh data from Oura
  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      // Clear server cache
      const res = await fetch(`${API_BASE}/api/dashboard/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to sync");
      }
      // Refetch fresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading your health data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <h2 className="text-xl font-light text-destructive mb-2">Unable to load data</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
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

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Pick a relevant health insight based on current scores
  const getHealthInsight = () => {
    const readiness = todayData.readiness.score;
    const sleep = todayData.sleep.score;

    if (readiness !== null && readiness >= 85) {
      return {
        title: "Healthy habits",
        description: "Your overall readiness is excellent. Your body has recovered well and you're ready for an active day ahead."
      };
    }
    if (sleep !== null && sleep >= 80) {
      return {
        title: "Quality rest",
        description: "Your sleep quality has been consistent. Long-term sleep quality benefits from regular bed and wake-up times."
      };
    }
    if (todayData.sleepDetails?.avgHrv && todayData.sleepDetails.avgHrv > 40) {
      return {
        title: "Good recovery",
        description: "Your HRV indicates good recovery. This suggests your nervous system is well-balanced."
      };
    }
    return {
      title: "Stay consistent",
      description: "Health is a journey. Small steps to support quality sleep, balanced recovery, and consistent activity can make a big difference over time."
    };
  };

  const insight = getHealthInsight();

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 pb-24 sm:pb-28">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Top Score Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
            <ScoreChip
              icon={<ReadinessIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              score={todayData.readiness.score}
              label="Readiness"
            />
            <ScoreChip
              icon={<SleepIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              score={todayData.sleep.score}
              label="Sleep"
            />
            <ScoreChip
              icon={<ActivityIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              score={todayData.activity.score}
              label="Activity"
            />
            <ScoreChip
              icon={<HeartIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              score={todayData.heartRate.latest}
              label="Heart rate"
            />
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-50"
            title="Sync with Oura"
          >
            <RefreshIcon className={cn("w-4 h-4", syncing && "animate-spin")} />
            <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>

        {/* Hero Section - Steps Counter */}
        <Card className="text-center py-6 sm:py-8">
          <div className="flex flex-col items-center">
            <StepsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mb-2" />
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Steps</span>
            <span className="text-4xl sm:text-5xl md:text-6xl font-light mt-2">
              {todayData.activity.steps?.toLocaleString() ?? "--"}
            </span>
            <p className="text-muted-foreground text-xs sm:text-sm mt-3">
              {getGreeting()}{userName ? `, ${userName}` : ""}
            </p>
            <p className="text-muted-foreground text-[10px] sm:text-xs mt-1">{today}</p>
          </div>
        </Card>

        {/* Main Scores Row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="flex flex-col items-center py-4 sm:py-6">
            <ScoreArc
              score={todayData.readiness.score}
              label="Readiness"
              status={getScoreStatus(todayData.readiness.score).text}
              color="var(--color-readiness)"
              size={90}
            />
          </Card>
          <Card className="flex flex-col items-center py-4 sm:py-6">
            <ScoreArc
              score={todayData.sleep.score}
              label="Sleep"
              status={getScoreStatus(todayData.sleep.score).text}
              color="var(--color-sleep)"
              size={90}
            />
          </Card>
          <Card className="flex flex-col items-center py-4 sm:py-6">
            <ScoreArc
              score={todayData.activity.score}
              label="Activity"
              status={getScoreStatus(todayData.activity.score).text}
              color="var(--color-activity)"
              size={90}
            />
          </Card>
        </div>

        {/* Health Insight */}
        <HealthInsight title={insight.title} description={insight.description} />

        {/* Sleep & Heart Rate Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Sleep Details */}
          <Card>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-sm sm:text-base font-light">Sleep</h2>
              <span className={getScoreStatus(todayData.sleep.score).className}>
                {getScoreStatus(todayData.sleep.score).text}
              </span>
            </div>
            {todayData.sleepDetails ? (
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-light">
                    {formatDuration(todayData.sleepDetails.totalSleep)}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground">total sleep</span>
                </div>

                <SleepStageBar sleepDetails={todayData.sleepDetails} />

                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                  <div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">Bedtime</span>
                    <div className="text-base sm:text-lg font-light">{formatTime(todayData.sleepDetails.bedtimeStart)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">Wake time</span>
                    <div className="text-base sm:text-lg font-light">{formatTime(todayData.sleepDetails.bedtimeEnd)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 border-t border-border">
                  <div className="pt-2 sm:pt-3">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">Avg HRV</span>
                    <div className="text-sm sm:text-lg font-light" style={{ color: "var(--color-hrv)" }}>
                      {todayData.sleepDetails.avgHrv ?? "--"} <span className="text-[10px] sm:text-xs text-muted-foreground">ms</span>
                    </div>
                  </div>
                  <div className="pt-2 sm:pt-3">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">Avg HR</span>
                    <div className="text-sm sm:text-lg font-light" style={{ color: "var(--color-hr)" }}>
                      {todayData.sleepDetails.avgHr ?? "--"} <span className="text-[10px] sm:text-xs text-muted-foreground">bpm</span>
                    </div>
                  </div>
                  <div className="pt-2 sm:pt-3">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">Lowest HR</span>
                    <div className="text-sm sm:text-lg font-light">
                      {todayData.sleepDetails.lowestHr ?? "--"} <span className="text-[10px] sm:text-xs text-muted-foreground">bpm</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No sleep data available</p>
            )}
          </Card>

          {/* Heart Rate */}
          <Card>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-sm sm:text-base font-light">Heart Rate</h2>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Today</span>
            </div>
            <HeartRateChart samples={todayData.heartRate.samples} latest={todayData.heartRate.latest} />
          </Card>
        </div>

        {/* Activity & Vitals Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <MetricCard
            icon={<FlameIcon />}
            label="Active Calories"
            value={todayData.activity.activeCalories}
            unit="cal"
          />
          <MetricCard
            icon={<HeartIcon className="w-4 h-4" />}
            label="Blood Oxygen"
            value={todayData.spo2.average}
            unit="%"
            status={todayData.spo2.average && todayData.spo2.average >= 95 ? "NORMAL" : undefined}
            statusClass="status-good"
          />
          <Card className="sm:col-span-2 md:col-span-1">
            <h3 className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">Stress & Recovery</h3>
            <StressRecoveryDonut stress={todayData.stress} />
          </Card>
        </div>

        {/* Today's Timeline - hidden on very small screens */}
        {todayData.sleepDetails && (
          <Card className="hidden sm:block">
            <h2 className="text-sm sm:text-base font-light mb-3 sm:mb-4">Today</h2>
            <div className="pl-1">
              <TimelineEvent
                icon={<SunriseIcon />}
                time={formatTime(todayData.sleepDetails.bedtimeEnd)}
                title="Woke up"
                details={[
                  { icon: <BedIcon />, text: formatDuration(todayData.sleepDetails.totalSleep) },
                  { icon: <ReadinessIcon className="w-4 h-4" />, text: `${todayData.readiness.score ?? "--"}` },
                  { icon: <SleepIcon className="w-4 h-4" />, text: `${todayData.sleep.score ?? "--"}` },
                ]}
              />
              <TimelineEvent
                icon={<BedIcon />}
                time={formatTime(todayData.sleepDetails.bedtimeStart)}
                title="Fell asleep"
                details={[
                  { text: `${todayData.sleepDetails.efficiency ?? "--"}% efficiency` },
                ]}
              />
            </div>
          </Card>
        )}

        {/* Weekly Trends */}
        <Card>
          <h2 className="text-sm sm:text-base font-light mb-3 sm:mb-4">7-Day Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">Scores</h3>
              <WeeklyTrendChart data={weekData} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">Daily Steps</h3>
              <StepsChart data={weekData} />
            </div>
          </div>
        </Card>

        {/* HRV Trend */}
        <Card>
          <h2 className="text-sm sm:text-base font-light mb-3 sm:mb-4">HRV Trend</h2>
          <div className="flex items-baseline gap-2 mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl font-light" style={{ color: "var(--color-hrv)" }}>
              {todayData.sleepDetails?.avgHrv ?? "--"}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">ms average</span>
          </div>
          <HrvTrendChart data={weekData} />
        </Card>
      </div>
    </div>
  );
}
