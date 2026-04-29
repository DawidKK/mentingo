import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

export type DropoutPredictorFeatures = {
  completion_percentage: number;
  avg_quiz_score: number;
  num_failed_attempts: number;
  days_since_last_activity: number;
  days_since_enrollment: number;
  lessons_completed: number;
  quiz_attempts_count: number;
};

export type DropoutPredictorRequest = {
  userId: string;
  features: DropoutPredictorFeatures;
};

export type DropoutPredictorResponse = {
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
};

@Injectable()
export class DropoutPredictorService {
  private readonly logger = new Logger(DropoutPredictorService.name);
  private readonly baseUrl = process.env.DROPOUT_PREDICTOR_URL ?? "http://localhost:8000";
  private readonly timeoutMs = Number(process.env.DROPOUT_PREDICTOR_TIMEOUT_MS ?? 2000);

  async predict(
    payload: DropoutPredictorRequest,
  ): Promise<{ prediction: DropoutPredictorResponse | null; fallback: boolean }> {
    try {
      const response = await axios.post<DropoutPredictorResponse>(
        `${this.baseUrl}/v1/predict`,
        payload,
        {
          timeout: this.timeoutMs,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      return { prediction: response.data, fallback: false };
    } catch (error) {
      this.logger.warn(
        `Dropout predictor unavailable; continuing with fallback path. url=${this.baseUrl}/v1/predict timeoutMs=${this.timeoutMs}`,
      );
      return { prediction: null, fallback: true };
    }
  }
}
