import { Module } from "@nestjs/common";

import { DropoutPredictorService } from "./dropout-predictor.service";

@Module({
  providers: [DropoutPredictorService],
  exports: [DropoutPredictorService],
})
export class DropoutPredictorModule {}
