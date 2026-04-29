import { useMutation } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

import type { DropoutFeatures } from "./dropoutFeatureStore";

export type DropoutPredictionResponse = {
  prediction: {
    userId: string;
    risk: {
      score: number;
      level: "low" | "medium" | "high";
      label: string;
    };
    keyDrivers: Array<{
      feature: string;
      label: string;
      value: number;
      impact: "low" | "medium" | "high";
      effect: "increases_risk";
    }>;
    protectiveSignals: Array<{
      feature: string;
      label: string;
      value: number;
      impact: "low" | "medium" | "high";
      effect: "reduces_risk";
    }>;
    modelInsights: {
      model: string;
      topFactors: Array<{
        feature: string;
        coefficient: number;
        direction: "risk_increase" | "risk_decrease";
      }>;
    };
  } | null;
  predictionUnavailable: boolean;
  source: "predictor" | "fallback";
};

export function useDropoutPrediction() {
  return useMutation({
    mutationFn: async ({
      userId,
      features,
    }: {
      userId: string;
      features: DropoutFeatures;
    }): Promise<DropoutPredictionResponse> => {
      const response = await ApiClient.instance.get<DropoutPredictionResponse>(
        "/api/dropout/prediction",
        {
          params: {
            userId,
            ...features,
          },
        },
      );

      return response.data;
    },
  });
}
