import { Module } from '@nestjs/common';
import { SellerProfileController } from './seller-profile.controller';
import { SellerProfileService } from './seller-profile.service';

@Module({
  controllers: [SellerProfileController],
  providers: [SellerProfileService],
  exports: [SellerProfileService],
})
export class SellerProfileModule {}
