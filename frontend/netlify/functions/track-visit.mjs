import { getStore } from "@netlify/blobs";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const store = getStore("visitor-stats");

  if (req.method === "POST") {
    const today = new Date().toISOString().split("T")[0];

    const [dailyRaw, totalRaw] = await Promise.all([
      store.get(`daily:${today}`),
      store.get("total"),
    ]);

    const dailyCount = parseInt(dailyRaw || "0", 10) + 1;
    const totalCount = parseInt(totalRaw || "0", 10) + 1;

    await Promise.all([
      store.set(`daily:${today}`, String(dailyCount)),
      store.set("total", String(totalCount)),
    ]);

    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  if (req.method === "GET") {
    const today = new Date().toISOString().split("T")[0];

    const totalRaw = await store.get("total");
    const total = parseInt(totalRaw || "0", 10);

    // Fetch last 30 days in parallel
    const dayPromises = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dayPromises.push(
        store.get(`daily:${dateStr}`).then((val) => ({
          date: dateStr,
          count: parseInt(val || "0", 10),
        }))
      );
    }

    const days = await Promise.all(dayPromises);
    const todayCount = days[0].count;

    return new Response(JSON.stringify({ total, today: todayCount, days }), {
      headers,
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers,
  });
};

export const config = {
  path: "/api/track-visit",
};
