export type DropoutFeatures = {
  completion_percentage: number;
  avg_quiz_score: number;
  num_failed_attempts: number;
  days_since_last_activity: number;
  days_since_enrollment: number;
  lessons_completed: number;
  quiz_attempts_count: number;
};

export const HIGH_RISK_SEED: DropoutFeatures = {
  completion_percentage: 0.12,
  avg_quiz_score: 0.44,
  num_failed_attempts: 4,
  days_since_last_activity: 10,
  days_since_enrollment: 25,
  lessons_completed: 2,
  quiz_attempts_count: 3,
};

export const MEDIUM_RISK_SEED: DropoutFeatures = {
  completion_percentage: 0.48,
  avg_quiz_score: 0.68,
  num_failed_attempts: 2,
  days_since_last_activity: 4,
  days_since_enrollment: 20,
  lessons_completed: 8,
  quiz_attempts_count: 6,
};

const STORAGE_PREFIX = "dropout_features::";

function clampFloat(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function clampFeatures(input: DropoutFeatures): DropoutFeatures {
  return {
    completion_percentage: clampFloat(input.completion_percentage, 0, 1),
    avg_quiz_score: clampFloat(input.avg_quiz_score, 0, 1),
    num_failed_attempts: clampInt(input.num_failed_attempts, 0, 5),
    days_since_last_activity: clampInt(input.days_since_last_activity, 0, 14),
    days_since_enrollment: clampInt(input.days_since_enrollment, 1, 45),
    lessons_completed: clampInt(input.lessons_completed, 0, 20),
    quiz_attempts_count: clampInt(input.quiz_attempts_count, 0, 12),
  };
}

function keyForUser(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function safeRead(userId: string): DropoutFeatures | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(keyForUser(userId));
  if (!raw) return null;

  try {
    return clampFeatures(JSON.parse(raw) as DropoutFeatures);
  } catch {
    return null;
  }
}

export function saveFeatures(userId: string, features: DropoutFeatures): DropoutFeatures {
  const clamped = clampFeatures(features);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(keyForUser(userId), JSON.stringify(clamped));
  }
  return clamped;
}

export function ensureFeatures(userId: string, seed: DropoutFeatures): DropoutFeatures {
  const existing = safeRead(userId);
  if (existing) return existing;
  return saveFeatures(userId, seed);
}

export function getFeatures(userId: string): DropoutFeatures {
  return safeRead(userId) ?? MEDIUM_RISK_SEED;
}

export function trackCourseOrLessonVisit(userId: string): DropoutFeatures {
  const current = getFeatures(userId);
  return saveFeatures(userId, {
    ...current,
    days_since_last_activity: current.days_since_last_activity - 1,
    quiz_attempts_count: current.quiz_attempts_count + 1,
  });
}

export function trackQuizAttempt(userId: string, isSuccess: boolean): DropoutFeatures {
  const current = getFeatures(userId);
  const adjustedQuiz = isSuccess ? current.avg_quiz_score + 0.05 : current.avg_quiz_score - 0.07;

  return saveFeatures(userId, {
    ...current,
    avg_quiz_score: adjustedQuiz,
    quiz_attempts_count: current.quiz_attempts_count + 1,
    num_failed_attempts: isSuccess ? current.num_failed_attempts : current.num_failed_attempts + 1,
  });
}

export function trackLessonCompleted(userId: string): DropoutFeatures {
  const current = getFeatures(userId);
  return saveFeatures(userId, {
    ...current,
    lessons_completed: current.lessons_completed + 1,
    completion_percentage: current.completion_percentage + 0.05,
    days_since_last_activity: current.days_since_last_activity - 1,
  });
}
