import { Module, forwardRef } from '@nestjs/common';
import { BulkUploadService } from './bulk-upload.service';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [forwardRef(() => ProductsModule), CategoriesModule],
  providers: [BulkUploadService],
  exports: [BulkUploadService],
})
export class BulkUploadModule {}
