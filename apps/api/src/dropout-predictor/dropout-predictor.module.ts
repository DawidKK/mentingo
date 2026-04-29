import { Module } from "@nestjs/common";

import { DropoutPredictorController } from "./dropout-predictor.controller";
import { DropoutPredictorService } from "./dropout-predictor.service";

@Module({
  controllers: [DropoutPredictorController],
  providers: [DropoutPredictorService],
  exports: [DropoutPredictorService],
})
export class DropoutPredictorModule {}
