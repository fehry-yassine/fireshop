import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ProductsService } from '../products/products.service';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  findAll() {
    return this.categoriesService.findAllPublic();
  }

  @Get('tree')
  findTree() {
    return this.categoriesService.findTreePublic();
  }

  @Get(':slug/products')
  findProductsByCategory(@Param('slug') slug: string) {
    return this.productsService.findByCategorySlugPublic(slug);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlugPublic(slug);
  }
}
