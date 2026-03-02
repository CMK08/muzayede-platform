import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { MediaService } from '../media/media.service';
import { BulkUploadService } from '../bulk-upload/bulk-upload.service';
import { CatalogService } from '../catalog/catalog.service';
import { CreateProductDto } from '../common/dto/create-product.dto';
import { UpdateProductDto } from '../common/dto/update-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly mediaService: MediaService,
    private readonly bulkUploadService: BulkUploadService,
    private readonly catalogService: CatalogService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(
    @Body() dto: CreateProductDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.productsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination, filters, and sorting' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'sellerId', required: false, type: String })
  @ApiQuery({ name: 'condition', required: false, enum: ['NEW', 'USED', 'RESTORED'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'oldest', 'priceAsc', 'priceDesc', 'title'] })
  @ApiResponse({ status: 200, description: 'Returns paginated product list' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('categoryId') categoryId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('condition') condition?: string,
    @Query('isActive') isActive?: boolean,
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    return this.productsService.findAll({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      categoryId,
      sellerId,
      condition,
      isActive,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      search,
      sort: sort as any,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID with full relations' })
  @ApiResponse({ status: 200, description: 'Returns product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product details' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.productsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Product has active auction lots' })
  async remove(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.productsService.delete(id, userId);
  }

  // --- Media Endpoints ---

  @Post(':id/media')
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product images/media' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.mediaService.uploadProductMedia(id, files);
  }

  @Post(':id/media/single')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single media file' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  async uploadSingleMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
  ) {
    return this.mediaService.upload(id, file, type);
  }

  @Delete('media/:mediaId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product media file' })
  @ApiResponse({ status: 204, description: 'Media deleted' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async deleteMedia(@Param('mediaId') mediaId: string) {
    return this.mediaService.deleteMedia(mediaId);
  }

  @Put(':id/media/reorder')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder product media' })
  @ApiBody({ schema: { type: 'object', properties: { mediaIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 200, description: 'Media reordered' })
  async reorderMedia(
    @Param('id') id: string,
    @Body('mediaIds') mediaIds: string[],
  ) {
    return this.mediaService.reorderMedia(id, mediaIds);
  }

  @Post(':id/media/presigned-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned S3 upload URL' })
  @ApiBody({ schema: { type: 'object', properties: { filename: { type: 'string' }, contentType: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Returns presigned upload URL' })
  async getPresignedUrl(
    @Param('id') id: string,
    @Body('filename') filename: string,
    @Body('contentType') contentType: string,
  ) {
    return this.mediaService.getPresignedUploadUrl(id, filename, contentType);
  }

  // --- Bulk Upload ---

  @Post('bulk-upload')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk upload products from Excel/CSV' })
  @ApiResponse({ status: 201, description: 'Bulk upload processed' })
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-user-id') userId: string,
  ) {
    return this.bulkUploadService.processBulkUpload(file, userId);
  }

  // --- Catalog PDF ---

  @Post('catalog/generate/:auctionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate auction catalog PDF' })
  @ApiResponse({ status: 201, description: 'Returns catalog PDF URL' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async generateCatalog(@Param('auctionId') auctionId: string) {
    const pdfUrl = await this.catalogService.generateCatalog(auctionId);
    return { pdfUrl };
  }
}
