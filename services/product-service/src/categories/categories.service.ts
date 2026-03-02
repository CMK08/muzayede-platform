import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from '../common/dto/create-category.dto';
import { UpdateCategoryDto } from '../common/dto/update-category.dto';
import { turkishSlug } from '../common/utils/turkish-slug';

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  depth: number;
  sortOrder: number;
  imageUrl: string | null;
  isActive: boolean;
  parentId: string | null;
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryTreeNode[]> {
    this.logger.log('Fetching all categories as tree');

    const categories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          select: { id: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.buildTree(categories, null);
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            depth: true,
            sortOrder: true,
            imageUrl: true,
            isActive: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    this.logger.log(`Creating category: ${dto.name}`);

    const baseSlug = turkishSlug(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    let depth = 0;
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
        select: { depth: true },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${dto.parentId} not found`);
      }
      depth = parent.depth + 1;
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId || null,
        depth,
        sortOrder: dto.sortOrder || 0,
        imageUrl: dto.imageUrl || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: true,
        _count: { select: { products: true } },
      },
    });

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, parentId: true, depth: true },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const updateData: Record<string, any> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = await this.ensureUniqueSlug(turkishSlug(dto.name), id);
    }
    if (dto.sortOrder !== undefined) {
      updateData.sortOrder = dto.sortOrder;
    }
    if (dto.imageUrl !== undefined) {
      updateData.imageUrl = dto.imageUrl;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('A category cannot be its own parent');
      }

      let newDepth = 0;
      if (dto.parentId) {
        const isDescendant = await this.isDescendantOf(dto.parentId, id);
        if (isDescendant) {
          throw new ConflictException(
            'Cannot set a descendant as the parent category (circular reference)',
          );
        }

        const newParent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
          select: { depth: true },
        });
        if (!newParent) {
          throw new NotFoundException(`Parent category with ID ${dto.parentId} not found`);
        }
        newDepth = newParent.depth + 1;
      }

      updateData.parentId = dto.parentId || null;
      updateData.depth = newDepth;

      const depthDelta = newDepth - existing.depth;
      if (depthDelta !== 0) {
        await this.updateDescendantDepths(id, depthDelta);
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, slug: true, depth: true, sortOrder: true },
        },
        _count: { select: { products: true } },
      },
    });

    return category;
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (category.children.length > 0) {
      throw new ConflictException(
        'Cannot delete category that has child categories. Remove or move children first.',
      );
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        `Cannot delete category that has ${category._count.products} products assigned.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    this.logger.log(`Category deleted: ${id}`);
  }

  private buildTree(categories: any[], parentId: string | null): CategoryTreeNode[] {
    return categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        depth: c.depth,
        sortOrder: c.sortOrder,
        imageUrl: c.imageUrl,
        isActive: c.isActive,
        parentId: c.parentId,
        children: this.buildTree(categories, c.id),
      }));
  }

  private async isDescendantOf(candidateId: string, ancestorId: string): Promise<boolean> {
    const children = await this.prisma.category.findMany({
      where: { parentId: ancestorId },
      select: { id: true },
    });

    for (const child of children) {
      if (child.id === candidateId) {
        return true;
      }
      const isDesc = await this.isDescendantOf(candidateId, child.id);
      if (isDesc) {
        return true;
      }
    }

    return false;
  }

  private async updateDescendantDepths(parentId: string, depthDelta: number): Promise<void> {
    const children = await this.prisma.category.findMany({
      where: { parentId },
      select: { id: true, depth: true },
    });

    for (const child of children) {
      await this.prisma.category.update({
        where: { id: child.id },
        data: { depth: child.depth + depthDelta },
      });
      await this.updateDescendantDepths(child.id, depthDelta);
    }
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 0;

    while (true) {
      const existing = await this.prisma.category.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }
}
