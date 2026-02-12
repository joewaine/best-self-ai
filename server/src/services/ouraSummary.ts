import { fetchDailyReadiness, fetchDailySleep } from "./oura";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getOuraSummaryForYesterday(token: string) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const day = isoDay(yesterday);

  const [sleepRes, readyRes] = await Promise.all([
    fetchDailySleep(day, token),
    fetchDailyReadiness(day, token),
  ]);

  const sleep = sleepRes.data?.[0];
  const readiness = readyRes.data?.[0];

  return {
    day,
    sleep: {
      score: sleep?.score ?? null,
      contributors: sleep?.contributors ?? null,
    },
    readiness: {
      score: readiness?.score ?? null,
      contributors: readiness?.contributors ?? null,
    },
  };
}
