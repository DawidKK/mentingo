import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";

import { useAllUsers } from "~/api/queries";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

import {
  clampFeatures,
  ensureFeatures,
  HIGH_RISK_SEED,
  MEDIUM_RISK_SEED,
  trackCourseOrLessonVisit,
  trackLessonCompleted,
  trackQuizAttempt,
} from "./dropoutFeatureStore";
import { useDropoutPrediction } from "./useDropoutPrediction";

import type { DropoutFeatures } from "./dropoutFeatureStore";
import type { ChartConfig } from "~/components/ui/chart";

const FEATURE_META: Record<
  keyof DropoutFeatures,
  { label: string; format: "pct" | "count" | "days" }
> = {
  completion_percentage: { label: "Completion", format: "pct" },
  avg_quiz_score: { label: "Avg Quiz Score", format: "pct" },
  num_failed_attempts: { label: "Failed Attempts", format: "count" },
  days_since_last_activity: { label: "Days Since Activity", format: "days" },
  days_since_enrollment: { label: "Days Since Enrollment", format: "days" },
  lessons_completed: { label: "Lessons Completed", format: "count" },
  quiz_attempts_count: { label: "Quiz Attempts", format: "count" },
};

const gaugeConfig = {
  risk: { label: "Risk", color: "var(--primary-700)" },
  rest: { label: "Rest", color: "var(--primary-200)" },
} satisfies ChartConfig;

const impactConfig = {
  value: { label: "Impact", color: "var(--primary-700)" },
} satisfies ChartConfig;

const PRESETS: {
  key: string;
  label: string;
  apply: (current: DropoutFeatures) => DropoutFeatures;
}[] = [
  {
    key: "inactive_week",
    label: "Inactive Week",
    apply: (current) => ({
      ...current,
      days_since_last_activity: current.days_since_last_activity + 5,
      completion_percentage: current.completion_percentage - 0.08,
    }),
  },
  {
    key: "quiz_struggles",
    label: "Quiz Struggles",
    apply: (current) => ({
      ...current,
      avg_quiz_score: current.avg_quiz_score - 0.12,
      num_failed_attempts: current.num_failed_attempts + 2,
      quiz_attempts_count: current.quiz_attempts_count + 2,
    }),
  },
  {
    key: "strong_engagement",
    label: "Strong Engagement",
    apply: (current) => ({
      ...current,
      days_since_last_activity: current.days_since_last_activity - 2,
      completion_percentage: current.completion_percentage + 0.1,
      lessons_completed: current.lessons_completed + 2,
      avg_quiz_score: current.avg_quiz_score + 0.08,
    }),
  },
  {
    key: "recovery_path",
    label: "Recovery Path",
    apply: (current) => ({
      ...current,
      days_since_last_activity: current.days_since_last_activity - 3,
      completion_percentage: current.completion_percentage + 0.06,
      num_failed_attempts: current.num_failed_attempts - 1,
      lessons_completed: current.lessons_completed + 1,
      avg_quiz_score: current.avg_quiz_score + 0.05,
    }),
  },
];

function formatFeatureValue(feature: keyof DropoutFeatures, value: number): string {
  const meta = FEATURE_META[feature];
  if (meta.format === "pct") {
    return `${Math.round(value * 100)}%`;
  }
  return `${Math.round(value)}`;
}

function riskBadgeClass(level?: "low" | "medium" | "high"): string {
  if (level === "high") return "bg-red-100 text-red-700 border-red-200";
  if (level === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function riskNarrative(prediction: {
  keyDrivers: Array<{ label: string }>;
  risk: { level: "low" | "medium" | "high" };
}): string {
  const firstDriver = prediction.keyDrivers[0]?.label?.toLowerCase();
  if (!firstDriver) return "Risk is stable with current engagement pattern.";
  if (prediction.risk.level === "high") {
    return `Risk increased mostly due to ${firstDriver}.`;
  }
  if (prediction.risk.level === "medium") {
    return `Risk is moderate; ${firstDriver} is the main pressure point.`;
  }
  return `Risk is low and engagement indicators look healthy.`;
}

function humanFeatureLabel(feature: string): string {
  if (feature in FEATURE_META) {
    return FEATURE_META[feature as keyof DropoutFeatures].label;
  }
  return feature.replaceAll("_", " ");
}

export function DropoutPredictionWidget() {
  const { data: studentsResponse } = useAllUsers({ role: "student", perPage: 20, page: 1 });

  const studentOptions = useMemo(() => {
    const students = studentsResponse?.data ?? [];
    if (students.length >= 2) {
      const normalized = students.map((user) => ({
        ...user,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
      }));
      const kavon = normalized.find((user) => user.firstName.toLowerCase() === "kavon");
      const lawson = normalized.find((user) => user.firstName.toLowerCase() === "lawson");
      const selectedPair = kavon && lawson ? [kavon, lawson] : normalized.slice(0, 2);

      return selectedPair.map((user, index) => ({
        id: user.id,
        label: user.fullName,
        seed: index === 0 ? MEDIUM_RISK_SEED : HIGH_RISK_SEED,
      }));
    }

    return [
      { id: "demo-medium-risk", label: "Demo User A (Medium Risk)", seed: MEDIUM_RISK_SEED },
      { id: "demo-high-risk", label: "Demo User B (High Risk)", seed: HIGH_RISK_SEED },
    ];
  }, [studentsResponse?.data]);

  const [selectedUserId, setSelectedUserId] = useState<string>(studentOptions[0]?.id ?? "");
  const [features, setFeatures] = useState(() =>
    ensureFeatures(
      studentOptions[0]?.id ?? "demo-medium-risk",
      studentOptions[0]?.seed ?? MEDIUM_RISK_SEED,
    ),
  );
  const [baselineFeatures, setBaselineFeatures] = useState<DropoutFeatures>(features);
  const [timeline, setTimeline] = useState<number[]>([]);
  const predictionMutation = useDropoutPrediction();

  useEffect(() => {
    const selectedOption = studentOptions.find((item) => item.id === selectedUserId);
    if (selectedOption) {
      const seeded = ensureFeatures(selectedOption.id, selectedOption.seed);
      setFeatures(seeded);
      setBaselineFeatures(seeded);
      setTimeline([]);
      return;
    }

    const firstOption = studentOptions[0];
    if (firstOption) {
      setSelectedUserId(firstOption.id);
      const seeded = ensureFeatures(firstOption.id, firstOption.seed);
      setFeatures(seeded);
      setBaselineFeatures(seeded);
      setTimeline([]);
    }
  }, [selectedUserId, studentOptions]);

  const prediction = predictionMutation.data?.prediction;
  const isFallback = predictionMutation.data?.predictionUnavailable;

  const chartGaugeData = useMemo(() => {
    const score = prediction?.risk.score ?? 0;
    return [
      { state: "risk", value: score, fill: "var(--color-risk)" },
      { state: "rest", value: 1 - score, fill: "var(--color-rest)" },
    ];
  }, [prediction?.risk.score]);

  const driverChartData = useMemo(() => {
    const riskData =
      prediction?.keyDrivers.map((item) => ({
        label: item.label,
        value: Number(item.value.toFixed(2)),
        direction: "risk",
      })) ?? [];
    const protectiveData =
      prediction?.protectiveSignals.map((item) => ({
        label: item.label,
        value: Number(item.value.toFixed(2)),
        direction: "protective",
      })) ?? [];

    return [...riskData, ...protectiveData].slice(0, 6);
  }, [prediction?.keyDrivers, prediction?.protectiveSignals]);

  const featureTiles = useMemo(() => {
    return (Object.keys(FEATURE_META) as Array<keyof DropoutFeatures>).map((key) => {
      const current = features[key];
      const baseline = baselineFeatures[key];
      const delta = Number((current - baseline).toFixed(2));
      return {
        key,
        label: FEATURE_META[key].label,
        value: formatFeatureValue(key, current),
        delta,
      };
    });
  }, [features, baselineFeatures]);

  const modelFactors = useMemo(() => {
    const factors = prediction?.modelInsights.topFactors ?? [];
    const maxAbs = Math.max(...factors.map((factor) => Math.abs(factor.coefficient)), 0);

    return factors.map((factor) => {
      const normalized = maxAbs > 0 ? Math.abs(factor.coefficient) / maxAbs : 0;
      const barWidth = Math.max(8, Math.round(normalized * 100));
      const directionText =
        factor.direction === "risk_increase"
          ? "When this goes up, risk usually goes up."
          : "When this goes up, risk usually goes down.";

      return {
        ...factor,
        label: humanFeatureLabel(factor.feature),
        barWidth,
        directionText,
      };
    });
  }, [prediction?.modelInsights.topFactors]);

  useEffect(() => {
    if (prediction?.risk.score !== undefined) {
      setTimeline((prev) => [...prev.slice(-9), Number((prediction.risk.score * 100).toFixed(1))]);
    }
  }, [prediction?.risk.score]);

  const simulatePreset = (presetKey: string) => {
    const preset = PRESETS.find((item) => item.key === presetKey);
    if (!preset) return;
    const next = clampFeatures(preset.apply(features));
    ensureFeatures(selectedUserId, next);
    const saved = clampFeatures(next);
    window.localStorage.setItem(`dropout_features::${selectedUserId}`, JSON.stringify(saved));
    setFeatures(saved);
  };

  return (
    <Card className="md:col-span-2 xl:col-span-4">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-xl">Dropout Prediction Cockpit</CardTitle>
          {prediction?.risk.level ? (
            <Badge className={cn("border", riskBadgeClass(prediction.risk.level))}>
              {prediction.risk.label}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-1">
            <p className="text-sm font-medium">Student user</p>
            <Select
              value={selectedUserId}
              onValueChange={(value) => {
                setSelectedUserId(value);
                const option = studentOptions.find((item) => item.id === value);
                if (option) {
                  const seeded = ensureFeatures(option.id, option.seed);
                  setFeatures(seeded);
                  setBaselineFeatures(seeded);
                }
                setTimeline([]);
                predictionMutation.reset();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {studentOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <p className="text-sm font-medium">Simulation presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  variant="outline"
                  size="sm"
                  onClick={() => simulatePreset(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-end lg:col-span-1">
            <Button
              onClick={() => {
                predictionMutation.mutate({ userId: selectedUserId, features });
              }}
            >
              Get prediction
            </Button>
          </div>
        </div>

        {prediction ? (
          <div className="rounded-lg bg-white p-4 drop-shadow-card">
            <div className="mb-3">
              <p className="text-sm font-medium text-neutral-700">How the model measures risk</p>
              <p className="text-xs text-neutral-500">
                This model learns patterns from student behavior. Longer bars mean stronger
                influence on the final risk score.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {modelFactors.map((factor) => (
                <div
                  key={factor.feature}
                  className="rounded-md border border-neutral-200 bg-neutral-50 p-2"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-neutral-700">{factor.label}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        factor.direction === "risk_increase"
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {factor.direction === "risk_increase" ? "Raises risk" : "Lowers risk"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-200">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        factor.direction === "risk_increase" ? "bg-red-500" : "bg-emerald-500",
                      )}
                      style={{ width: `${factor.barWidth}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-600">{factor.directionText}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-neutral-500">
              Model type: {prediction.modelInsights.model}. Coefficients are shown as relative
              influence for demo explainability.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-4 drop-shadow-card">
            <p className="mb-3 text-sm font-medium text-neutral-700">Risk gauge</p>
            <p className="mb-3 text-xs text-neutral-500">
              Overall chance that this student may stop learning soon. Higher percentage means
              higher risk.
            </p>
            <ChartContainer config={gaugeConfig} className="mx-auto aspect-square h-[220px]">
              <PieChart>
                <Pie
                  data={chartGaugeData}
                  dataKey="value"
                  nameKey="state"
                  innerRadius={70}
                  outerRadius={95}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={6}
                >
                  {chartGaugeData.map((entry, idx) => (
                    <Cell key={`${entry.state}-${idx}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (
                        viewBox &&
                        "cx" in viewBox &&
                        "cy" in viewBox &&
                        typeof viewBox.cx === "number" &&
                        typeof viewBox.cy === "number"
                      ) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan x={viewBox.cx} y={viewBox.cy} className="h3 fill-primary-950">
                              {prediction ? `${Math.round(prediction.risk.score * 100)}%` : "--"}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy + 22}
                              className="body-sm-md fill-neutral-600"
                            >
                              dropout risk
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              </PieChart>
            </ChartContainer>
            <p className="mt-2 text-center text-xs text-neutral-600">
              {prediction
                ? riskNarrative(prediction)
                : "Run prediction to generate narrative insights."}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 drop-shadow-card lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">Feature health snapshot</p>
                <p className="text-xs text-neutral-500">
                  Student learning signals used by the model, shown in simple progress-style
                  metrics.
                </p>
              </div>
              <p className="text-xs text-neutral-500">Compared to initial seeded profile</p>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {featureTiles.map((tile) => (
                <div
                  key={tile.key}
                  className="rounded-md border border-neutral-200 bg-neutral-50 p-2"
                >
                  <p className="text-xs text-neutral-500">{tile.label}</p>
                  <p className="body-lg-md text-neutral-900">{tile.value}</p>
                  <p
                    className={cn(
                      "text-xs",
                      tile.delta === 0
                        ? "text-neutral-500"
                        : tile.delta > 0
                          ? "text-emerald-600"
                          : "text-red-600",
                    )}
                  >
                    {tile.delta > 0 ? `+${tile.delta}` : `${tile.delta}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-lg bg-white p-4 drop-shadow-card">
            <p className="mb-3 text-sm font-medium text-neutral-700">Driver impact breakdown</p>
            <p className="mb-3 text-xs text-neutral-500">
              Red bars push risk up, green bars lower risk. This explains why the current score
              looks the way it does.
            </p>
            <ChartContainer config={impactConfig} className="h-[230px] w-full">
              <BarChart data={driverChartData} layout="vertical" margin={{ left: 20, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={6}>
                  {driverChartData.map((item, idx) => (
                    <Cell
                      key={`${item.label}-${idx}`}
                      fill={item.direction === "risk" ? "#ef4444" : "#10b981"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-neutral-700">Risk movement (session)</p>
            {timeline.length ? (
              <div className="flex h-10 items-end gap-1">
                {timeline.map((point, idx) => (
                  <div
                    key={`${point}-${idx}`}
                    className="flex-1 rounded-t bg-primary-700/70"
                    style={{ height: `${Math.max(8, point)}%` }}
                    title={`${point}%`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Run prediction multiple times to see trend.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-neutral-700">Advanced controls</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeatures(trackCourseOrLessonVisit(selectedUserId))}
              >
                Track visit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeatures(trackLessonCompleted(selectedUserId))}
              >
                Track lesson complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeatures(trackQuizAttempt(selectedUserId, true))}
              >
                Quiz success
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeatures(trackQuizAttempt(selectedUserId, false))}
              >
                Quiz fail
              </Button>
            </div>
          </div>
        </div>

        {predictionMutation.isPending ? (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            Calculating updated prediction...
          </div>
        ) : null}

        {predictionMutation.isSuccess && isFallback ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Prediction model temporarily unavailable. Showing fallback state while preserving
            current simulation.
          </div>
        ) : null}

        {predictionMutation.isSuccess && prediction ? (
          <p className="text-xs text-neutral-500">
            Last update source: {predictionMutation.data?.source}. Updated at{" "}
            {new Date().toLocaleTimeString()}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
