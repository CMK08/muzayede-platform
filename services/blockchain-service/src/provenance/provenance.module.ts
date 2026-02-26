import { Module } from '@nestjs/common';
import { ProvenanceService } from './provenance.service';
import { ProvenanceController } from './provenance.controller';

@Module({
  controllers: [ProvenanceController],
  providers: [ProvenanceService],
  exports: [ProvenanceService],
})
export class ProvenanceModule {}
