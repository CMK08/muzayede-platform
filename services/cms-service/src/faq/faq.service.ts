import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    category?: string;
    page?: number;
    limit?: number;
    publicOnly?: boolean;
  }) {
    this.logger.log(`Listing FAQs: ${JSON.stringify(query || {})}`);

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;
    const publicOnly = query?.publicOnly ?? true;

    const where: any = {};

    if (query?.category) {
      where.category = query.category;
    }

    if (publicOnly) {
      where.isActive = true;
    }

    const [faqs, total] = await Promise.all([
      this.prisma.faq.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.faq.count({ where }),
    ]);

    return {
      data: faqs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    this.logger.log(`Getting FAQ: ${id}`);

    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ with ID '${id}' not found`);
    }

    return faq;
  }

  async getGroupedByCategory() {
    this.logger.log('Getting FAQs grouped by category');

    const faqs = await this.prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const grouped: Record<string, typeof faqs> = {};

    for (const faq of faqs) {
      const category = faq.category || 'Genel';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(faq);
    }

    return {
      data: Object.entries(grouped).map(([category, items]) => ({
        category,
        count: items.length,
        items,
      })),
    };
  }

  async getCategories() {
    this.logger.log('Getting FAQ categories');

    const faqs = await this.prisma.faq.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return {
      data: faqs
        .map((f) => f.category)
        .filter((c): c is string => c !== null),
    };
  }

  async create(dto: {
    question: string;
    answer: string;
    category?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    this.logger.log(`Creating FAQ: ${dto.question.substring(0, 50)}...`);

    return this.prisma.faq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    dto: {
      question?: string;
      answer?: string;
      category?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    this.logger.log(`Updating FAQ: ${id}`);

    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ with ID '${id}' not found`);
    }

    return this.prisma.faq.update({
      where: { id },
      data: {
        ...(dto.question !== undefined && { question: dto.question }),
        ...(dto.answer !== undefined && { answer: dto.answer }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(id: string) {
    this.logger.log(`Deleting FAQ: ${id}`);

    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ with ID '${id}' not found`);
    }

    await this.prisma.faq.delete({ where: { id } });
    return { deleted: true };
  }

  async reorder(faqIds: string[]) {
    this.logger.log(`Reordering ${faqIds.length} FAQs`);

    const updates = faqIds.map((id, index) =>
      this.prisma.faq.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);
    return { reordered: true, count: faqIds.length };
  }

  async toggleActive(id: string) {
    this.logger.log(`Toggling FAQ active status: ${id}`);

    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ with ID '${id}' not found`);
    }

    return this.prisma.faq.update({
      where: { id },
      data: { isActive: !faq.isActive },
    });
  }
}
