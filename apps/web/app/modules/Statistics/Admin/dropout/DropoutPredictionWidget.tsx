import { useEffect, useMemo, useState } from "react";

import { useAllUsers } from "~/api/queries";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import {
  ensureFeatures,
  getFeatures,
  HIGH_RISK_SEED,
  MEDIUM_RISK_SEED,
  trackCourseOrLessonVisit,
  trackLessonCompleted,
  trackQuizAttempt,
} from "./dropoutFeatureStore";
import { useDropoutPrediction } from "./useDropoutPrediction";

function formatValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

export function DropoutPredictionWidget() {
  const { data: studentsResponse } = useAllUsers({ role: "student", perPage: 20, page: 1 });

  const studentOptions = useMemo(() => {
    const students = studentsResponse?.data ?? [];
    if (students.length >= 2) {
      return students.slice(0, 2).map((user, index) => ({
        id: user.id,
        label: `${user.firstName} ${user.lastName}`,
        seed: index === 0 ? HIGH_RISK_SEED : MEDIUM_RISK_SEED,
      }));
    }

    return [
      { id: "demo-high-risk", label: "Demo User A (High Risk)", seed: HIGH_RISK_SEED },
      { id: "demo-medium-risk", label: "Demo User B (Medium Risk)", seed: MEDIUM_RISK_SEED },
    ];
  }, [studentsResponse?.data]);

  const [selectedUserId, setSelectedUserId] = useState<string>(studentOptions[0]?.id ?? "");
  const [features, setFeatures] = useState(() =>
    ensureFeatures(
      studentOptions[0]?.id ?? "demo-high-risk",
      studentOptions[0]?.seed ?? HIGH_RISK_SEED,
    ),
  );
  const predictionMutation = useDropoutPrediction();

  useEffect(() => {
    const selectedOption = studentOptions.find((item) => item.id === selectedUserId);
    if (selectedOption) {
      setFeatures(ensureFeatures(selectedOption.id, selectedOption.seed));
      return;
    }

    const firstOption = studentOptions[0];
    if (firstOption) {
      setSelectedUserId(firstOption.id);
      setFeatures(ensureFeatures(firstOption.id, firstOption.seed));
    }
  }, [selectedUserId, studentOptions]);

  const prediction = predictionMutation.data?.prediction;
  const isFallback = predictionMutation.data?.predictionUnavailable;

  return (
    <Card className="md:col-span-2 xl:col-span-4">
      <CardHeader>
        <CardTitle>Dropout Prediction Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Student user</p>
            <Select
              value={selectedUserId}
              onValueChange={(value) => {
                setSelectedUserId(value);
                const option = studentOptions.find((item) => item.id === value);
                if (option) {
                  setFeatures(ensureFeatures(option.id, option.seed));
                } else {
                  setFeatures(getFeatures(value));
                }
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
          <div className="flex items-end">
            <Button
              onClick={() => {
                predictionMutation.mutate({
                  userId: selectedUserId,
                  features,
                });
              }}
            >
              Get prediction
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const next = trackCourseOrLessonVisit(selectedUserId);
                setFeatures(next);
              }}
            >
              Track visit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const next = trackLessonCompleted(selectedUserId);
                setFeatures(next);
              }}
            >
              Track lesson complete
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const next = trackQuizAttempt(selectedUserId, true);
                setFeatures(next);
              }}
            >
              Quiz success
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const next = trackQuizAttempt(selectedUserId, false);
                setFeatures(next);
              }}
            >
              Quiz fail
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Current features (localStorage)</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(features).map(([key, value]) => (
              <div key={key} className="rounded-md border p-2 text-sm">
                <div className="text-muted-foreground">{key}</div>
                <div className="font-semibold">{formatValue(value)}</div>
              </div>
            ))}
          </div>
        </div>

        {predictionMutation.isPending ? <p className="text-sm">Loading prediction...</p> : null}

        {predictionMutation.isSuccess ? (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <p>
              Source: <span className="font-semibold">{predictionMutation.data?.source}</span>
            </p>
            {isFallback ? <p>Prediction currently unavailable. Fallback path used.</p> : null}
            {prediction ? (
              <>
                <p>
                  Risk score: <span className="font-semibold">{prediction.risk.score}</span>
                </p>
                <p>
                  Risk level: <span className="font-semibold">{prediction.risk.level}</span>
                </p>
                <p>
                  Key drivers: <span className="font-semibold">{prediction.keyDrivers.length}</span>
                </p>
                <p>
                  Protective signals:{" "}
                  <span className="font-semibold">{prediction.protectiveSignals.length}</span>
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
