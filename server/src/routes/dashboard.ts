import { Router, Response } from "express";
import {
  fetchDailySleep,
  fetchDailyReadiness,
  fetchDailyActivity,
  fetchHeartRate,
  fetchDailyStress,
  fetchDailySpo2,
  fetchSleepPeriods,
  fetchDailySleepRange,
  fetchDailyReadinessRange,
  fetchDailyActivityRange,
} from "../services/oura";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { getStorage } from "../services/storage";
import { getCache, CACHE_TTL } from "../services/cache";

const router = Router();

function getDateString(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

router.get("/today", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const storage = getStorage();
    const cache = getCache();
    const ouraToken = storage.getOuraToken(userId);

    if (!ouraToken) {
      return res.status(400).json({ error: "No Oura token configured. Please add your Oura personal access token in settings." });
    }

    const today = getDateString(0);
    const cacheKey = `${userId}:dashboard:today:${today}`;

    // Check cache first
    const cached = cache.get<object>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const yesterday = getDateString(1);

    const [sleep, readiness, activity, stress, spo2, heartRate, sleepPeriods] =
      await Promise.all([
        fetchDailySleep(today, ouraToken).catch(() => ({ data: [] })),
        fetchDailyReadiness(today, ouraToken).catch(() => ({ data: [] })),
        fetchDailyActivity(today, ouraToken).catch(() => ({ data: [] })),
        fetchDailyStress(today, ouraToken).catch(() => ({ data: [] })),
        fetchDailySpo2(today, ouraToken).catch(() => ({ data: [] })),
        fetchHeartRate(today, today, ouraToken).catch(() => ({ data: [] })),
        fetchSleepPeriods(yesterday, today, ouraToken).catch(() => ({ data: [] })),
      ]);

    const latestSleep = sleepPeriods.data[sleepPeriods.data.length - 1];

    const result = {
      date: today,
      sleep: {
        score: sleep.data[0]?.score ?? null,
        contributors: sleep.data[0]?.contributors ?? null,
      },
      readiness: {
        score: readiness.data[0]?.score ?? null,
        contributors: readiness.data[0]?.contributors ?? null,
      },
      activity: {
        score: activity.data[0]?.score ?? null,
        steps: activity.data[0]?.steps ?? null,
        activeCalories: activity.data[0]?.active_calories ?? null,
        totalCalories: activity.data[0]?.total_calories ?? null,
        contributors: activity.data[0]?.contributors ?? null,
      },
      stress: {
        stressHigh: stress.data[0]?.stress_high ?? null,
        recoveryHigh: stress.data[0]?.recovery_high ?? null,
        summary: stress.data[0]?.day_summary ?? null,
      },
      spo2: {
        average: spo2.data[0]?.spo2_percentage?.average ?? null,
      },
      heartRate: {
        samples: heartRate.data.slice(-48).map((hr) => ({
          bpm: hr.bpm,
          time: hr.timestamp,
        })),
        latest: heartRate.data[heartRate.data.length - 1]?.bpm ?? null,
      },
      sleepDetails: latestSleep
        ? {
            bedtimeStart: latestSleep.bedtime_start,
            bedtimeEnd: latestSleep.bedtime_end,
            totalSleep: latestSleep.total_sleep_duration,
            deepSleep: latestSleep.deep_sleep_duration,
            remSleep: latestSleep.rem_sleep_duration,
            lightSleep: latestSleep.light_sleep_duration,
            awakeTime: latestSleep.awake_time,
            avgHr: latestSleep.average_heart_rate,
            lowestHr: latestSleep.lowest_heart_rate,
            avgHrv: latestSleep.average_hrv,
            efficiency: latestSleep.efficiency,
          }
        : null,
    };

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL.DASHBOARD_TODAY);

    res.json(result);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

router.get("/week", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const storage = getStorage();
    const cache = getCache();
    const ouraToken = storage.getOuraToken(userId);

    if (!ouraToken) {
      return res.status(400).json({ error: "No Oura token configured. Please add your Oura personal access token in settings." });
    }

    const today = getDateString(0);
    const weekAgo = getDateString(7);
    const cacheKey = `${userId}:dashboard:week:${today}`;

    // Check cache first
    const cached = cache.get<object>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [sleepRange, readinessRange, activityRange, sleepPeriods] =
      await Promise.all([
        fetchDailySleepRange(weekAgo, today, ouraToken).catch(() => ({ data: [] })),
        fetchDailyReadinessRange(weekAgo, today, ouraToken).catch(() => ({ data: [] })),
        fetchDailyActivityRange(weekAgo, today, ouraToken).catch(() => ({ data: [] })),
        fetchSleepPeriods(weekAgo, today, ouraToken).catch(() => ({ data: [] })),
      ]);

    const result = {
      startDate: weekAgo,
      endDate: today,
      sleep: sleepRange.data.map((d) => ({
        day: d.day,
        score: d.score ?? null,
      })),
      readiness: readinessRange.data.map((d) => ({
        day: d.day,
        score: d.score ?? null,
      })),
      activity: activityRange.data.map((d) => ({
        day: d.day,
        score: d.score ?? null,
        steps: d.steps ?? null,
        activeCalories: d.active_calories ?? null,
      })),
      sleepDetails: sleepPeriods.data.map((s) => ({
        day: s.day,
        avgHrv: s.average_hrv ?? null,
        avgHr: s.average_heart_rate ?? null,
        totalSleep: s.total_sleep_duration ?? null,
        deepSleep: s.deep_sleep_duration ?? null,
        remSleep: s.rem_sleep_duration ?? null,
      })),
    };

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL.DASHBOARD_WEEK);

    res.json(result);
  } catch (error) {
    console.error("Week dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch week data" });
  }
});

export default router;
