"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Session = { started_at: string; active_seconds: number };
const chartConfig = { minutes: { label: "Active minutes", color: "var(--chart-1)" } };
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function LearningActivityChart({ sessions }: { sessions: Session[] }) {
  const data = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return { key: localDateKey(date), label: date.toLocaleDateString("en", { weekday: "short" }), minutes: 0 };
    });
    const byDate = new Map(days.map((day) => [day.key, day]));
    sessions.forEach((session) => {
      const day = byDate.get(localDateKey(new Date(session.started_at)));
      if (day) day.minutes += Math.round(session.active_seconds / 60);
    });
    return days.map(({ label, minutes }) => ({ day: label, minutes }));
  }, [sessions]);

  return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="mb-4"><p className="text-[9px] uppercase tracking-[0.17em] text-white/40">Recent activity</p><h2 className="mt-2 text-lg font-medium tracking-[-0.04em]">Active minutes · last 7 days</h2><p className="mt-1 text-[10px] text-white/35">Observed activity only. It is not evidence of course completion.</p></div><ChartContainer config={chartConfig} className="h-[190px] w-full"><BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)"/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#888", fontSize: 10 }}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#777", fontSize: 9 }}/><ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} min`} />} cursor={{ fill: "rgba(255,255,255,0.04)" }}/><Bar dataKey="minutes" fill="var(--color-minutes)" radius={[5,5,0,0]} maxBarSize={28}/></BarChart></ChartContainer><p className="sr-only">{data.map((day) => `${day.day}: ${day.minutes} minutes`).join(". ")}</p></section>;
}
