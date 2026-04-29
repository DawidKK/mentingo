import { Test } from "@nestjs/testing";

import { DropoutPredictorController } from "./dropout-predictor.controller";
import { DropoutPredictorService } from "./dropout-predictor.service";

describe("DropoutPredictorController", () => {
  it("returns predictor response with availability metadata", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DropoutPredictorController],
      providers: [
        {
          provide: DropoutPredictorService,
          useValue: {
            predict: jest.fn().mockResolvedValue({
              prediction: {
                userId: "user-1",
                risk: { score: 0.72, level: "high", label: "High Dropout Risk" },
                keyDrivers: [],
                protectiveSignals: [],
                modelInsights: { model: "Logistic Regression", topFactors: [] },
              },
              fallback: false,
            }),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(DropoutPredictorController);
    const result = await controller.getPrediction("user-1", 0.2, 0.5, 3, 7, 20, 2, 4);

    expect(result.predictionUnavailable).toBe(false);
    expect(result.source).toBe("predictor");
    expect(result.prediction?.userId).toBe("user-1");
  });

  it("returns fallback shape when predictor is unavailable", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DropoutPredictorController],
      providers: [
        {
          provide: DropoutPredictorService,
          useValue: {
            predict: jest.fn().mockResolvedValue({
              prediction: null,
              fallback: true,
            }),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(DropoutPredictorController);
    const result = await controller.getPrediction("user-2", 0.6, 0.7, 1, 2, 10, 8, 6);

    expect(result.prediction).toBeNull();
    expect(result.predictionUnavailable).toBe(true);
    expect(result.source).toBe("fallback");
  });
});
