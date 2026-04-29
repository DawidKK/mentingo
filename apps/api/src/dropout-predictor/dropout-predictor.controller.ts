import { Controller, Get, ParseFloatPipe, ParseIntPipe, Query } from "@nestjs/common";

import { DropoutPredictorService } from "./dropout-predictor.service";

@Controller("dropout")
export class DropoutPredictorController {
  constructor(private readonly dropoutPredictorService: DropoutPredictorService) {}

  @Get("prediction")
  async getPrediction(
    @Query("userId") userId: string,
    @Query("completion_percentage", ParseFloatPipe) completionPercentage: number,
    @Query("avg_quiz_score", ParseFloatPipe) avgQuizScore: number,
    @Query("num_failed_attempts", ParseIntPipe) numFailedAttempts: number,
    @Query("days_since_last_activity", ParseIntPipe) daysSinceLastActivity: number,
    @Query("days_since_enrollment", ParseIntPipe) daysSinceEnrollment: number,
    @Query("lessons_completed", ParseIntPipe) lessonsCompleted: number,
    @Query("quiz_attempts_count", ParseIntPipe) quizAttemptsCount: number,
  ) {
    const result = await this.dropoutPredictorService.predict({
      userId,
      features: {
        completion_percentage: completionPercentage,
        avg_quiz_score: avgQuizScore,
        num_failed_attempts: numFailedAttempts,
        days_since_last_activity: daysSinceLastActivity,
        days_since_enrollment: daysSinceEnrollment,
        lessons_completed: lessonsCompleted,
        quiz_attempts_count: quizAttemptsCount,
      },
    });

    return {
      prediction: result.prediction,
      predictionUnavailable: result.fallback,
      source: result.fallback ? "fallback" : "predictor",
    };
  }
}
