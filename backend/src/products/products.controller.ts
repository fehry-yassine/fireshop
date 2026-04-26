import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('category') categorySlug?: string) {
    return this.productsService.findAllPublic({ categorySlug });
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlugPublic(slug);
  }

  // TODO: Protect this route with a vendor/admin guard when auth is implemented.
  @Post()
  createProduct(@Body() body: unknown) {
    return this.productsService.createManage(body ?? {});
  }

  // TODO: Protect this route with a vendor/admin guard when auth is implemented.
  @Patch(':id')
  updateProduct(@Param('id') id: string, @Body() body: unknown) {
    return this.productsService.updateManage(id, body ?? {});
  }

  // TODO: Protect this route with a vendor/admin guard when auth is implemented.
  @Delete(':id')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.softArchiveManage(id);
  }
}
