import { render, screen } from "@testing-library/react";

import { DropoutPredictionWidget } from "./DropoutPredictionWidget";

vi.mock("~/api/queries", () => ({
  useAllUsers: () => ({
    data: {
      data: [
        { id: "user-kavon", firstName: "Kavon", lastName: "Student" },
        { id: "user-lawson", firstName: "Lawson", lastName: "Student" },
      ],
    },
  }),
}));

vi.mock("./useDropoutPrediction", () => ({
  useDropoutPrediction: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: true,
    data: {
      predictionUnavailable: false,
      source: "predictor",
      prediction: {
        userId: "user-kavon",
        risk: { score: 0.72, level: "high", label: "High Dropout Risk" },
        keyDrivers: [{ feature: "days_since_last_activity" }],
        protectiveSignals: [{ feature: "avg_quiz_score" }],
        modelInsights: { model: "Logistic Regression", topFactors: [] },
      },
    },
  }),
}));

describe("DropoutPredictionWidget", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders widget and prediction details", () => {
    render(<DropoutPredictionWidget />);

    expect(screen.getByText("Dropout Prediction Demo")).toBeInTheDocument();
    expect(screen.getByText(/Risk score:/)).toBeInTheDocument();
    expect(screen.getByText(/Risk level:/)).toBeInTheDocument();
    expect(screen.getByText(/Source:/)).toBeInTheDocument();
  });
});
