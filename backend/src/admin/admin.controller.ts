import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // TODO: Protect this route with an admin-only guard when auth is implemented.
  @Post('categories')
  createCategory(@Body() body: unknown) {
    return this.categoriesService.createAdmin(body ?? {});
  }

  // TODO: Protect this route with an admin-only guard when auth is implemented.
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: unknown) {
    return this.categoriesService.updateAdmin(id, body ?? {});
  }

  // TODO: Protect this route with an admin-only guard when auth is implemented.
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.softDeleteAdmin(id);
  }
}
