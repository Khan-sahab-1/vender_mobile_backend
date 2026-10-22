import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTerm, PaymentTermLine } from './entities/payment-term.entity';
import { PaymentTermsService } from './payment-terms.service';
import { PaymentTermsController } from './payment-terms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTerm, PaymentTermLine])],
  controllers: [PaymentTermsController],
  providers: [PaymentTermsService],
  exports: [PaymentTermsService],
})
export class PaymentTermsModule {}
