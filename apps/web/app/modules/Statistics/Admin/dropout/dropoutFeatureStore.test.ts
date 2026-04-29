import {
  clampFeatures,
  ensureFeatures,
  HIGH_RISK_SEED,
  MEDIUM_RISK_SEED,
  trackCourseOrLessonVisit,
  trackLessonCompleted,
  trackQuizAttempt,
} from "./dropoutFeatureStore";

describe("dropoutFeatureStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("seeds default profile per user on first read", () => {
    const high = ensureFeatures("user-high", HIGH_RISK_SEED);
    const medium = ensureFeatures("user-medium", MEDIUM_RISK_SEED);

    expect(high.completion_percentage).toBeLessThan(medium.completion_percentage);
    expect(high.days_since_last_activity).toBeGreaterThan(medium.days_since_last_activity);
  });

  it("clamps all feature fields to expected ranges", () => {
    const clamped = clampFeatures({
      completion_percentage: 99,
      avg_quiz_score: -99,
      num_failed_attempts: 10,
      days_since_last_activity: -10,
      days_since_enrollment: 0,
      lessons_completed: 999,
      quiz_attempts_count: -99,
    });

    expect(clamped).toEqual({
      completion_percentage: 1,
      avg_quiz_score: 0,
      num_failed_attempts: 5,
      days_since_last_activity: 0,
      days_since_enrollment: 1,
      lessons_completed: 20,
      quiz_attempts_count: 0,
    });
  });

  it("updates features via tracker helpers", () => {
    const before = ensureFeatures("user-medium", MEDIUM_RISK_SEED);
    const afterVisit = trackCourseOrLessonVisit("user-medium");
    const afterFail = trackQuizAttempt("user-medium", false);
    const afterLesson = trackLessonCompleted("user-medium");

    expect(afterVisit.days_since_last_activity).toBeLessThanOrEqual(
      before.days_since_last_activity,
    );
    expect(afterFail.num_failed_attempts).toBeGreaterThanOrEqual(before.num_failed_attempts);
    expect(afterLesson.lessons_completed).toBeGreaterThanOrEqual(before.lessons_completed);
  });
});
