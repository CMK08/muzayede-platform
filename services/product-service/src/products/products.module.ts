import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesModule } from '../categories/categories.module';
import { MediaModule } from '../media/media.module';
import { BulkUploadService } from '../bulk-upload/bulk-upload.service';
import { CatalogService } from '../catalog/catalog.service';

@Module({
  imports: [CategoriesModule, MediaModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    BulkUploadService,
    CatalogService,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
