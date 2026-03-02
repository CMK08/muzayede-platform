import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionStateMachine } from './auction-state.machine';
import { AntiSnipeService } from '../anti-snipe/anti-snipe.service';
import { CreateAuctionDto } from '../dto/create-auction.dto';
import { UpdateAuctionDto } from '../dto/update-auction.dto';
import {
  EnglishAuctionStrategy,
  DutchAuctionStrategy,
  SealedBidStrategy,
  VickreyAuctionStrategy,
  TimedAuctionStrategy,
  HybridAuctionStrategy,
} from '../types';
import { AuctionTypeStrategy, AuctionResult } from '../types/auction-type.interface';

// Turkish character map for slug generation
const TURKISH_CHAR_MAP: Record<string, string> = {
  '\u011f': 'g', // g with breve
  '\u011e': 'G',
  '\u0131': 'i', // dotless i
  '\u0130': 'I', // dotted I
  '\u015f': 's', // s with cedilla
  '\u015e': 'S',
  '\u00f6': 'o', // o with diaeresis
  '\u00d6': 'O',
  '\u00fc': 'u', // u with diaeresis
  '\u00dc': 'U',
  '\u00e7': 'c', // c with cedilla
  '\u00c7': 'C',
};

function generateSlug(text: string): string {
  let slug = text;
  slug = slug.replace(/[^\u0000-\u007F]/g, (char) => TURKISH_CHAR_MAP[char] ?? char);
  slug = slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slug.length > 120) {
    slug = slug.substring(0, 120).replace(/-$/, '');
  }

  return slug;
}

interface AuctionQuery {
  page: number;
  limit: number;
  status?: string;
  type?: string;
  categoryId?: string;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  startDateFrom?: string;
  startDateTo?: string;
  createdBy?: string;
  auctionHouseId?: string;
}

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);
  private readonly strategies: Map<string, AuctionTypeStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: AuctionStateMachine,
    private readonly antiSnipeService: AntiSnipeService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Register all strategies
    const english = new EnglishAuctionStrategy();
    const dutch = new DutchAuctionStrategy();
    const sealedBid = new SealedBidStrategy();
    const vickrey = new VickreyAuctionStrategy();
    const timed = new TimedAuctionStrategy();
    const hybrid = new HybridAuctionStrategy();

    this.strategies = new Map<string, AuctionTypeStrategy>([
      ['ENGLISH', english],
      ['DUTCH', dutch],
      ['SEALED_BID', sealedBid],
      ['VICKREY', vickrey],
      ['TIMED', timed],
      ['HYBRID', hybrid],
    ]);
  }

  getStrategy(type: string): AuctionTypeStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new BadRequestException(`Unsupported auction type: ${type}`);
    }
    return strategy;
  }

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  async create(dto: CreateAuctionDto, userId: string) {
    this.logger.log(`Creating auction: ${dto.title} by user ${userId}`);

    const baseSlug = generateSlug(dto.title);

    // Ensure slug uniqueness by appending a short random suffix
    const slugSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug}-${slugSuffix}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Build auction data
      const auctionData: Prisma.AuctionCreateInput = {
        title: dto.title,
        slug,
        description: dto.description ?? null,
        type: dto.type as any,
        status: 'DRAFT' as any,
        startPrice: new Prisma.Decimal(dto.startPrice),
        reservePrice: dto.reservePrice ? new Prisma.Decimal(dto.reservePrice) : null,
        currentPrice: new Prisma.Decimal(dto.startPrice),
        minIncrement: new Prisma.Decimal(dto.minIncrement),
        buyerCommissionRate: dto.buyerCommissionRate
          ? new Prisma.Decimal(dto.buyerCommissionRate)
          : new Prisma.Decimal(0),
        sellerCommissionRate: dto.sellerCommissionRate
          ? new Prisma.Decimal(dto.sellerCommissionRate)
          : new Prisma.Decimal(0),
        currency: dto.currency || 'TRY',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        antiSnipeMinutes: dto.antiSnipeMinutes ?? 5,
        antiSnipeExtension: dto.antiSnipeExtension ?? 3,
        coverImageUrl: dto.coverImageUrl ?? null,
        catalogPdfUrl: dto.catalogPdfUrl ?? null,
        isLiveStreaming: dto.isLiveStreaming ?? false,
        streamUrl: dto.streamUrl ?? null,
        buyNowPrice: dto.buyNowPrice ? new Prisma.Decimal(dto.buyNowPrice) : null,
        buyNowEnabled: dto.buyNowEnabled ?? false,
        creator: { connect: { id: userId } },
        ...(dto.auctionHouseId
          ? { sellerProfile: { connect: { id: dto.auctionHouseId } } }
          : {}),
        // Dutch-specific fields
        dutchStartPrice: dto.dutchStartPrice
          ? new Prisma.Decimal(dto.dutchStartPrice)
          : null,
        dutchDecrement: dto.dutchDecrement
          ? new Prisma.Decimal(dto.dutchDecrement)
          : null,
        dutchDecrementInterval: dto.dutchDecrementInterval ?? null,
      };

      // For DUTCH type, set currentPrice to dutchStartPrice
      if (dto.type === 'DUTCH' && dto.dutchStartPrice) {
        auctionData.currentPrice = new Prisma.Decimal(dto.dutchStartPrice);
      }

      const auction = await tx.auction.create({ data: auctionData });

      // Create BidIncrement records if provided
      if (dto.bidIncrements && dto.bidIncrements.length > 0) {
        await tx.bidIncrement.createMany({
          data: dto.bidIncrements.map((inc) => ({
            auctionId: auction.id,
            priceFrom: new Prisma.Decimal(inc.priceFrom),
            priceTo: new Prisma.Decimal(inc.priceTo),
            incrementAmount: new Prisma.Decimal(inc.incrementAmount),
          })),
        });
      }

      // Create AuctionLot records if products are provided
      if (dto.lots && dto.lots.length > 0) {
        await tx.auctionLot.createMany({
          data: dto.lots.map((lot) => ({
            auctionId: auction.id,
            productId: lot.productId,
            lotNumber: lot.lotNumber,
            sortOrder: lot.sortOrder ?? lot.lotNumber,
            status: 'pending',
          })),
        });
      }

      // Create AuditLog entry
      await tx.auditLog.create({
        data: {
          userId,
          action: 'auction.created',
          entityType: 'Auction',
          entityId: auction.id,
          metadata: {
            title: dto.title,
            type: dto.type,
            startPrice: dto.startPrice,
          },
        },
      });

      return auction;
    });

    // Fetch the full auction with relations
    const fullAuction = await this.prisma.auction.findUnique({
      where: { id: result.id },
      include: {
        lots: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        increments: true,
        creator: {
          select: { id: true, email: true, profile: { select: { displayName: true } } },
        },
        _count: { select: { follows: true, bids: true } },
      },
    });

    this.logger.log(`Auction created: ${result.id} (slug: ${slug})`);
    return fullAuction;
  }

  // ---------------------------------------------------------------------------
  // FIND ALL (paginated, filtered, sorted)
  // ---------------------------------------------------------------------------

  async findAll(query: AuctionQuery) {
    this.logger.log(`Listing auctions with filters: ${JSON.stringify(query)}`);

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: Prisma.AuctionWhereInput = {};

    if (query.status) {
      where.status = query.status as any;
    }
    if (query.type) {
      where.type = query.type as any;
    }
    if (query.createdBy) {
      where.createdBy = query.createdBy;
    }
    if (query.auctionHouseId) {
      where.auctionHouseId = query.auctionHouseId;
    }

    // Category filter through lots -> product -> category
    if (query.categoryId) {
      where.lots = {
        some: {
          product: {
            categoryId: query.categoryId,
          },
        },
      };
    }

    // Price range filter
    if ((query.minPrice !== undefined && !isNaN(Number(query.minPrice))) || (query.maxPrice !== undefined && !isNaN(Number(query.maxPrice)))) {
      where.currentPrice = {};
      if (query.minPrice !== undefined && !isNaN(Number(query.minPrice))) {
        where.currentPrice.gte = new Prisma.Decimal(Number(query.minPrice));
      }
      if (query.maxPrice !== undefined && !isNaN(Number(query.maxPrice))) {
        where.currentPrice.lte = new Prisma.Decimal(Number(query.maxPrice));
      }
    }

    // Date range filter
    if (query.startDateFrom || query.startDateTo) {
      where.startDate = {};
      if (query.startDateFrom) {
        where.startDate.gte = new Date(query.startDateFrom);
      }
      if (query.startDateTo) {
        where.startDate.lte = new Date(query.startDateTo);
      }
    }

    // Search by title (case-insensitive)
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    // Build orderBy
    let orderBy: Prisma.AuctionOrderByWithRelationInput | Prisma.AuctionOrderByWithRelationInput[];
    switch (query.sort) {
      case 'endingSoon':
        where.status = 'LIVE' as any;
        orderBy = { endDate: 'asc' };
        break;
      case 'priceAsc':
        orderBy = { currentPrice: 'asc' };
        break;
      case 'priceDesc':
        orderBy = { currentPrice: 'desc' };
        break;
      case 'mostBids':
        orderBy = { bidCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [data, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: { select: { lots: true, bids: true } },
        },
        // coverImageUrl is a direct field on the auction
      }),
      this.prisma.auction.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // FEATURED (for homepage)
  // ---------------------------------------------------------------------------

  async getFeatured() {
    const data = await this.prisma.auction.findMany({
      where: {
        status: { in: ['LIVE', 'PUBLISHED', 'PRE_BID'] as any },
      },
      orderBy: [{ bidCount: 'desc' }, { viewCount: 'desc' }],
      take: 8,
      include: {
        _count: { select: { lots: true, bids: true } },
        lots: {
          take: 1,
          include: {
            product: {
              include: {
                media: { where: { isPrimary: true }, take: 1 },
                category: true,
              },
            },
          },
        },
      },
    });

    return { data };
  }

  // ---------------------------------------------------------------------------
  // UPCOMING
  // ---------------------------------------------------------------------------

  async getUpcoming() {
    const now = new Date();
    const data = await this.prisma.auction.findMany({
      where: {
        status: { in: ['PUBLISHED', 'PRE_BID'] as any },
        startDate: { gt: now },
      },
      orderBy: { startDate: 'asc' },
      take: 6,
      include: {
        _count: { select: { lots: true, bids: true } },
        lots: {
          take: 1,
          include: {
            product: {
              include: {
                media: { where: { isPrimary: true }, take: 1 },
                category: true,
              },
            },
          },
        },
      },
    });

    return { data };
  }

  // ---------------------------------------------------------------------------
  // CATEGORIES (with auction counts)
  // ---------------------------------------------------------------------------

  async getCategories() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    const data = categories.map((cat) => ({
      id: cat.slug || cat.id,
      name: cat.name,
      count: cat._count.products,
    }));

    return { data };
  }

  // ---------------------------------------------------------------------------
  // FIND BY ID
  // ---------------------------------------------------------------------------

  async findById(id: string) {
    this.logger.log(`Finding auction: ${id}`);

    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        lots: {
          include: {
            product: {
              include: {
                media: { orderBy: { sortOrder: 'asc' } },
                category: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        bids: {
          where: { isRetracted: false },
          orderBy: { amount: 'desc' },
          take: 10,
          select: {
            id: true,
            userId: true,
            amount: true,
            type: true,
            isWinning: true,
            createdAt: true,
          },
        },
        increments: { orderBy: { priceFrom: 'asc' } },
        creator: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, firstName: true, lastName: true } },
          },
        },
        _count: { select: { follows: true, bids: true } },
      },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    // Increment viewCount (fire-and-forget, not awaited to keep response fast)
    this.prisma.auction
      .update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => this.logger.error(`Failed to increment viewCount for ${id}: ${err.message}`));

    return auction;
  }

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  async update(id: string, dto: UpdateAuctionDto, userId: string) {
    const auction = await this.prisma.auction.findUnique({ where: { id } });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    if (auction.status !== 'DRAFT') {
      throw new BadRequestException('Only auctions in DRAFT status can be updated');
    }

    if (auction.createdBy !== userId) {
      throw new ForbiddenException('Only the auction creator can update this auction');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Build update data from DTO
      const updateData: Prisma.AuctionUpdateInput = {};

      if (dto.title !== undefined) {
        updateData.title = dto.title;
        updateData.slug = `${generateSlug(dto.title)}-${Math.random().toString(36).substring(2, 8)}`;
      }
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.startPrice !== undefined) {
        updateData.startPrice = new Prisma.Decimal(dto.startPrice);
        updateData.currentPrice = new Prisma.Decimal(dto.startPrice);
      }
      if (dto.reservePrice !== undefined)
        updateData.reservePrice = new Prisma.Decimal(dto.reservePrice);
      if (dto.minIncrement !== undefined)
        updateData.minIncrement = new Prisma.Decimal(dto.minIncrement);
      if (dto.buyerCommissionRate !== undefined)
        updateData.buyerCommissionRate = new Prisma.Decimal(dto.buyerCommissionRate);
      if (dto.sellerCommissionRate !== undefined)
        updateData.sellerCommissionRate = new Prisma.Decimal(dto.sellerCommissionRate);
      if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
      if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
      if (dto.antiSnipeMinutes !== undefined)
        updateData.antiSnipeMinutes = dto.antiSnipeMinutes;
      if (dto.antiSnipeExtension !== undefined)
        updateData.antiSnipeExtension = dto.antiSnipeExtension;
      if (dto.dutchStartPrice !== undefined)
        updateData.dutchStartPrice = new Prisma.Decimal(dto.dutchStartPrice);
      if (dto.dutchDecrement !== undefined)
        updateData.dutchDecrement = new Prisma.Decimal(dto.dutchDecrement);
      if (dto.dutchDecrementInterval !== undefined)
        updateData.dutchDecrementInterval = dto.dutchDecrementInterval;
      if (dto.buyNowPrice !== undefined)
        updateData.buyNowPrice = new Prisma.Decimal(dto.buyNowPrice);
      if (dto.buyNowEnabled !== undefined)
        updateData.buyNowEnabled = dto.buyNowEnabled;
      if (dto.coverImageUrl !== undefined) updateData.coverImageUrl = dto.coverImageUrl;
      if (dto.catalogPdfUrl !== undefined) updateData.catalogPdfUrl = dto.catalogPdfUrl;
      if (dto.isLiveStreaming !== undefined)
        updateData.isLiveStreaming = dto.isLiveStreaming;
      if (dto.streamUrl !== undefined) updateData.streamUrl = dto.streamUrl;

      const updated = await tx.auction.update({
        where: { id },
        data: updateData,
      });

      // Handle lot updates: replace all lots if provided
      if (dto.lots !== undefined) {
        await tx.auctionLot.deleteMany({ where: { auctionId: id } });
        if (dto.lots.length > 0) {
          await tx.auctionLot.createMany({
            data: dto.lots.map((lot) => ({
              auctionId: id,
              productId: lot.productId,
              lotNumber: lot.lotNumber,
              sortOrder: lot.sortOrder ?? lot.lotNumber,
              status: 'pending',
            })),
          });
        }
      }

      // Handle bid increment updates: replace all if provided
      if (dto.bidIncrements !== undefined) {
        await tx.bidIncrement.deleteMany({ where: { auctionId: id } });
        if (dto.bidIncrements.length > 0) {
          await tx.bidIncrement.createMany({
            data: dto.bidIncrements.map((inc) => ({
              auctionId: id,
              priceFrom: new Prisma.Decimal(inc.priceFrom),
              priceTo: new Prisma.Decimal(inc.priceTo),
              incrementAmount: new Prisma.Decimal(inc.incrementAmount),
            })),
          });
        }
      }

      // Create AuditLog entry
      await tx.auditLog.create({
        data: {
          userId,
          action: 'auction.updated',
          entityType: 'Auction',
          entityId: id,
          metadata: { updatedFields: Object.keys(dto).filter((k) => (dto as any)[k] !== undefined) },
        },
      });

      return updated;
    });

    return this.findById(result.id);
  }

  // ---------------------------------------------------------------------------
  // PUBLISH
  // ---------------------------------------------------------------------------

  async publish(id: string, userId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: { _count: { select: { lots: true } } },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    // Validate user is creator
    if (auction.createdBy !== userId) {
      throw new ForbiddenException('Only the auction creator can publish this auction');
    }

    // Use state machine for transition validation
    const newStatus = this.stateMachine.transition(auction.status, 'PUBLISH');

    // Validation: must have at least 1 lot
    if (auction._count.lots < 1) {
      throw new BadRequestException('Auction must have at least one lot before publishing');
    }

    // Validation: startDate must be in the future
    if (new Date(auction.startDate) <= new Date()) {
      throw new BadRequestException('Auction start date must be in the future');
    }

    // Validation: valid prices
    if (Number(auction.startPrice) <= 0) {
      throw new BadRequestException('Start price must be greater than zero');
    }
    if (auction.reservePrice && Number(auction.reservePrice) < Number(auction.startPrice)) {
      throw new BadRequestException('Reserve price must be greater than or equal to start price');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.auction.update({
        where: { id },
        data: { status: newStatus as any },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'auction.published',
          entityType: 'Auction',
          entityId: id,
          metadata: { previousStatus: auction.status, newStatus },
        },
      });

      return result;
    });

    this.logger.log(`Auction ${id} published by user ${userId}`);

    this.eventEmitter.emit('auction.published', { auctionId: id });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // START
  // ---------------------------------------------------------------------------

  async start(id: string) {
    const auction = await this.prisma.auction.findUnique({ where: { id } });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    const newStatus = this.stateMachine.transition(auction.status, 'START');

    // Set currentPrice appropriately
    let currentPrice = auction.startPrice;
    if (auction.type === 'DUTCH' && auction.dutchStartPrice) {
      currentPrice = auction.dutchStartPrice;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.auction.update({
        where: { id },
        data: {
          status: newStatus as any,
          currentPrice,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'auction.started',
          entityType: 'Auction',
          entityId: id,
          metadata: {
            previousStatus: auction.status,
            newStatus,
            currentPrice: currentPrice.toString(),
          },
        },
      });

      return result;
    });

    this.logger.log(`Auction ${id} started`);

    this.eventEmitter.emit('auction.started', {
      auctionId: id,
      type: auction.type,
      currentPrice: Number(currentPrice),
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // END
  // ---------------------------------------------------------------------------

  async end(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        bids: {
          where: { isRetracted: false },
          orderBy: { amount: 'desc' },
        },
        lots: true,
      },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    const newStatus = this.stateMachine.transition(auction.status, 'END');

    // Determine winner using the appropriate strategy
    const strategy = this.getStrategy(auction.type);
    const auctionResult: AuctionResult = strategy.determineWinner(
      id,
      auction.bids,
      auction.reservePrice ? Number(auction.reservePrice) : undefined,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update auction status
      const updatedAuction = await tx.auction.update({
        where: { id },
        data: {
          status: newStatus as any,
          actualEndDate: new Date(),
          reserveMet: auctionResult.reserveMet,
          currentPrice: auctionResult.finalPrice > 0
            ? new Prisma.Decimal(auctionResult.finalPrice)
            : auction.currentPrice,
        },
      });

      // If there is a winner, mark winning bid and create order
      if (auctionResult.winnerId && auctionResult.winningBidId) {
        // Mark the winning bid
        await tx.bid.update({
          where: { id: auctionResult.winningBidId },
          data: { isWinning: true },
        });

        // Update lot statuses
        for (const lot of auction.lots) {
          await tx.auctionLot.update({
            where: { id: lot.id },
            data: {
              status: 'sold',
              hammerPrice: new Prisma.Decimal(auctionResult.finalPrice),
              winnerId: auctionResult.winnerId,
            },
          });
        }

        // Create Order for the winner
        const hammerPrice = auctionResult.finalPrice;
        const buyerCommRate = Number(auction.buyerCommissionRate);
        const sellerCommRate = Number(auction.sellerCommissionRate);
        const buyerCommission = hammerPrice * buyerCommRate;
        const sellerCommission = hammerPrice * sellerCommRate;
        const vatRate = 0.20; // Turkish VAT
        const vatAmount = (hammerPrice + buyerCommission) * vatRate;
        const totalAmount = hammerPrice + buyerCommission + vatAmount;

        // Generate order number
        const orderCount = await tx.order.count();
        const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(orderCount + 1).padStart(5, '0')}`;

        await tx.order.create({
          data: {
            orderNumber,
            auctionId: id,
            bidId: auctionResult.winningBidId,
            buyerId: auctionResult.winnerId,
            sellerId: auction.createdBy,
            hammerPrice: new Prisma.Decimal(hammerPrice),
            buyerCommission: new Prisma.Decimal(buyerCommission),
            sellerCommission: new Prisma.Decimal(sellerCommission),
            vatRate: new Prisma.Decimal(vatRate),
            vatAmount: new Prisma.Decimal(vatAmount),
            totalAmount: new Prisma.Decimal(totalAmount),
            currency: auction.currency,
            status: 'PENDING_PAYMENT' as any,
          },
        });
      } else {
        // No winner: mark lots as unsold
        for (const lot of auction.lots) {
          await tx.auctionLot.update({
            where: { id: lot.id },
            data: { status: 'unsold' },
          });
        }
      }

      // Create AuditLog
      await tx.auditLog.create({
        data: {
          action: 'auction.ended',
          entityType: 'Auction',
          entityId: id,
          metadata: {
            previousStatus: auction.status,
            newStatus,
            winnerId: auctionResult.winnerId,
            finalPrice: auctionResult.finalPrice,
            totalBids: auctionResult.totalBids,
            reserveMet: auctionResult.reserveMet,
          },
        },
      });

      return updatedAuction;
    });

    this.logger.log(
      `Auction ${id} ended. Winner: ${auctionResult.winnerId ?? 'none'}, Price: ${auctionResult.finalPrice}`,
    );

    // Clean up anti-snipe extension counter
    this.antiSnipeService.resetExtensionCount(id);

    // Emit events
    this.eventEmitter.emit('auction.ended', {
      auctionId: id,
      winnerId: auctionResult.winnerId,
      finalPrice: auctionResult.finalPrice,
      reserveMet: auctionResult.reserveMet,
    });

    if (auctionResult.winnerId) {
      this.eventEmitter.emit('auction.won', {
        auctionId: id,
        winnerId: auctionResult.winnerId,
        finalPrice: auctionResult.finalPrice,
      });
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------------------------

  async cancel(id: string, userId?: string, reason?: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        follows: { select: { userId: true } },
        bids: { select: { userId: true }, distinct: ['userId'] },
      },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    const newStatus = this.stateMachine.transition(auction.status, 'CANCEL');
    const wasLive = auction.status === 'LIVE';

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.auction.update({
        where: { id },
        data: {
          status: newStatus as any,
          actualEndDate: new Date(),
        },
      });

      // Mark all lots as withdrawn
      await tx.auctionLot.updateMany({
        where: { auctionId: id },
        data: { status: 'withdrawn' },
      });

      await tx.auditLog.create({
        data: {
          userId: userId ?? null,
          action: 'auction.cancelled',
          entityType: 'Auction',
          entityId: id,
          metadata: {
            previousStatus: auction.status,
            newStatus,
            reason: reason ?? 'No reason provided',
            wasLive,
          },
        },
      });

      return result;
    });

    this.logger.log(`Auction ${id} cancelled. Reason: ${reason ?? 'No reason provided'}`);

    // If was LIVE, notify all bidders and followers
    if (wasLive) {
      const bidderUserIds = auction.bids.map((b) => b.userId);
      const followerUserIds = auction.follows.map((f) => f.userId);
      const allUserIds = [...new Set([...bidderUserIds, ...followerUserIds])];

      this.eventEmitter.emit('auction.cancelled', {
        auctionId: id,
        reason: reason ?? 'Auction has been cancelled',
        notifyUserIds: allUserIds,
      });
    }

    // Clean up anti-snipe extension counter
    this.antiSnipeService.resetExtensionCount(id);

    return updated;
  }

  // ---------------------------------------------------------------------------
  // FOLLOW / UNFOLLOW
  // ---------------------------------------------------------------------------

  async follow(auctionId: string, userId: string) {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    try {
      const follow = await this.prisma.auctionFollow.create({
        data: {
          userId,
          auctionId,
        },
      });
      return follow;
    } catch (error: any) {
      // Handle unique constraint violation (already following)
      if (error.code === 'P2002') {
        throw new BadRequestException('You are already following this auction');
      }
      throw error;
    }
  }

  async unfollow(auctionId: string, userId: string) {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    const follow = await this.prisma.auctionFollow.findUnique({
      where: { userId_auctionId: { userId, auctionId } },
    });

    if (!follow) {
      throw new NotFoundException('You are not following this auction');
    }

    await this.prisma.auctionFollow.delete({
      where: { id: follow.id },
    });

    return { message: 'Unfollowed successfully' };
  }

  async getFollowersCount(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    const count = await this.prisma.auctionFollow.count({
      where: { auctionId },
    });

    return { auctionId, followersCount: count };
  }

  // ---------------------------------------------------------------------------
  // HANDLE BID PLACED (called from bid service)
  // ---------------------------------------------------------------------------

  async handleBidPlaced(auctionId: string, bidAmount: number, bidderId: string): Promise<void> {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    const strategy = this.getStrategy(auction.type);
    const newPrice = strategy.calculateNewPrice({
      auctionId,
      bidderId,
      sellerId: auction.createdBy,
      bidAmount,
      currentPrice: Number(auction.currentPrice),
      startPrice: Number(auction.startPrice),
      reservePrice: auction.reservePrice ? Number(auction.reservePrice) : undefined,
      minIncrement: Number(auction.minIncrement),
      auctionStatus: auction.status,
      auctionType: auction.type,
      timestamp: new Date(),
      endDate: auction.actualEndDate ?? auction.endDate,
      antiSnipeMinutes: auction.antiSnipeMinutes,
    });

    // Update auction price and bid count
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        currentPrice: new Prisma.Decimal(newPrice),
        bidCount: { increment: 1 },
        reserveMet: auction.reservePrice
          ? newPrice >= Number(auction.reservePrice)
          : true,
      },
    });

    // Check anti-snipe extension
    const effectiveEndDate = auction.actualEndDate ?? auction.endDate;
    const shouldExtend = strategy.shouldExtend({
      auctionId,
      bidderId,
      sellerId: auction.createdBy,
      bidAmount,
      currentPrice: newPrice,
      startPrice: Number(auction.startPrice),
      minIncrement: Number(auction.minIncrement),
      auctionStatus: auction.status,
      auctionType: auction.type,
      timestamp: new Date(),
      endDate: effectiveEndDate,
      antiSnipeMinutes: auction.antiSnipeMinutes,
    });

    if (shouldExtend) {
      await this.antiSnipeService.checkAndExtend(
        auctionId,
        effectiveEndDate,
        new Date(),
        auction.antiSnipeMinutes,
        auction.antiSnipeExtension,
      );
    }
  }
}
