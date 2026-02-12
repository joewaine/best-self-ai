type OuraListResponse<T> = {
  data: T[];
  next_token?: string | null;
};

export type DailySleep = {
  day: string;
  score?: number;
  contributors?: Record<string, number>;
};

export type DailyReadiness = {
  day: string;
  score?: number;
  contributors?: Record<string, number>;
};

export type DailyActivity = {
  day: string;
  score?: number;
  active_calories?: number;
  total_calories?: number;
  steps?: number;
  equivalent_walking_distance?: number;
  high_activity_time?: number;
  medium_activity_time?: number;
  low_activity_time?: number;
  sedentary_time?: number;
  resting_time?: number;
  met?: { interval: number; items: number[]; timestamp: string };
  contributors?: Record<string, number>;
};

export type HeartRate = {
  bpm: number;
  source: string;
  timestamp: string;
};

export type DailyStress = {
  day: string;
  stress_high?: number;
  recovery_high?: number;
  day_summary?: string;
};

export type DailySpo2 = {
  day: string;
  spo2_percentage?: { average: number };
};

export type Sleep = {
  id: string;
  day: string;
  bedtime_start?: string;
  bedtime_end?: string;
  time_in_bed?: number;
  total_sleep_duration?: number;
  awake_time?: number;
  light_sleep_duration?: number;
  deep_sleep_duration?: number;
  rem_sleep_duration?: number;
  restless_periods?: number;
  average_heart_rate?: number;
  lowest_heart_rate?: number;
  average_hrv?: number;
  efficiency?: number;
};

const OURA_BASE = "https://api.ouraring.com/v2/usercollection";

export type PersonalInfo = {
  id: string;
  age?: number;
  weight?: number;
  height?: number;
  biological_sex?: "male" | "female";
  email?: string;
};

export async function fetchPersonalInfo(token: string): Promise<PersonalInfo> {
  const res = await fetch(`${OURA_BASE}/personal_info`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Oura error ${res.status}: ${await res.text()}`);
  return (await res.json()) as PersonalInfo;
}

async function ouraGet<T>(path: string, params: Record<string, string>, token: string) {
  const url = new URL(`${OURA_BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Oura error ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function fetchDailySleep(day: string, token: string) {
  return ouraGet<OuraListResponse<DailySleep>>("daily_sleep", {
    start_date: day,
    end_date: day,
  }, token);
}

export async function fetchDailyReadiness(day: string, token: string) {
  return ouraGet<OuraListResponse<DailyReadiness>>("daily_readiness", {
    start_date: day,
    end_date: day,
  }, token);
}

export async function fetchDailyActivity(day: string, token: string) {
  return ouraGet<OuraListResponse<DailyActivity>>("daily_activity", {
    start_date: day,
    end_date: day,
  }, token);
}

export async function fetchHeartRate(startDate: string, endDate: string, token: string) {
  return ouraGet<OuraListResponse<HeartRate>>("heartrate", {
    start_datetime: `${startDate}T00:00:00+00:00`,
    end_datetime: `${endDate}T23:59:59+00:00`,
  }, token);
}

export async function fetchDailyStress(day: string, token: string) {
  return ouraGet<OuraListResponse<DailyStress>>("daily_stress", {
    start_date: day,
    end_date: day,
  }, token);
}

export async function fetchDailySpo2(day: string, token: string) {
  return ouraGet<OuraListResponse<DailySpo2>>("daily_spo2", {
    start_date: day,
    end_date: day,
  }, token);
}

export async function fetchSleepPeriods(startDate: string, endDate: string, token: string) {
  return ouraGet<OuraListResponse<Sleep>>("sleep", {
    start_date: startDate,
    end_date: endDate,
  }, token);
}

export async function fetchDailyActivityRange(startDate: string, endDate: string, token: string) {
  return ouraGet<OuraListResponse<DailyActivity>>("daily_activity", {
    start_date: startDate,
    end_date: endDate,
  }, token);
}

export async function fetchDailySleepRange(startDate: string, endDate: string, token: string) {
  return ouraGet<OuraListResponse<DailySleep>>("daily_sleep", {
    start_date: startDate,
    end_date: endDate,
  }, token);
}

export async function fetchDailyReadinessRange(startDate: string, endDate: string, token: string) {
  return ouraGet<OuraListResponse<DailyReadiness>>("daily_readiness", {
    start_date: startDate,
    end_date: endDate,
  }, token);
}
