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
      predictionUnavailable: true,
      source: "fallback",
      prediction: null,
    },
  }),
}));

describe("DropoutPredictionWidget fallback", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders fallback message when predictor unavailable", () => {
    render(<DropoutPredictionWidget />);
    expect(screen.getByText(/Prediction currently unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/Source:/)).toBeInTheDocument();
  });
});
