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

  async findAll(category?: string, publicOnly = true) {
    this.logger.log(`Listing FAQs: category=${category || 'all'}, publicOnly=${publicOnly}`);

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (publicOnly) {
      where.isActive = true;
    }

    return this.prisma.faq.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
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
