import {
  PrismaClient,
  UserRole,
  AuctionType,
  AuctionStatus,
  ProductCondition,
  MediaType,
  BidType,
  OrderStatus,
  NotificationChannel,
} from '@prisma/client';

const prisma = new PrismaClient();

// bcrypt hash for "Test1234!" with 12 rounds
const PASSWORD_HASH = '$2b$12$8JOHxdPJ1Mr1j0uIiAcZZ.SmEI3lW6hkQLQIpguxVI/LiXF2EQy1.';

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // CLEANUP - delete data that doesn't use upsert
  // ============================================================
  console.log('Cleaning up existing seed data...');
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sellerPayout.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.order.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.bidIncrement.deleteMany();
  await prisma.auctionLot.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.productAttribute.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.page.deleteMany();

  // ============================================================
  // 1. CATEGORIES
  // ============================================================
  console.log('Seeding categories...');
  const categoryData = [
    { name: 'Tablolar', slug: 'tablolar' },
    { name: 'Heykeller', slug: 'heykeller' },
    { name: 'Antikalar', slug: 'antikalar' },
    { name: 'Mücevher', slug: 'mucevher' },
    { name: 'Saatler', slug: 'saatler' },
    { name: 'Mobilya', slug: 'mobilya' },
    { name: 'Fotoğraf', slug: 'fotograf' },
    { name: 'Kitap ve El Yazmaları', slug: 'kitap-el-yazmalari' },
    { name: 'Seramik ve Cam', slug: 'seramik-cam' },
    { name: 'Halı ve Tekstil', slug: 'hali-tekstil' },
    { name: 'Dijital Sanat', slug: 'dijital-sanat' },
    { name: 'Diğer', slug: 'diger' },
  ];

  const categories: Record<string, string> = {};
  for (let i = 0; i < categoryData.length; i++) {
    const cat = await prisma.category.upsert({
      where: { slug: categoryData[i].slug },
      update: {},
      create: { ...categoryData[i], depth: 0, sortOrder: i },
    });
    categories[cat.slug] = cat.id;
  }

  // ============================================================
  // 2. USERS (8 total)
  // ============================================================
  console.log('Seeding users...');

  // Admin 1 (existing)
  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@muzayede.com' },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      email: 'admin@muzayede.com',
      passwordHash: PASSWORD_HASH,
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      language: 'tr',
      profile: {
        create: {
          firstName: 'Sistem',
          lastName: 'Admin',
          displayName: 'Admin',
          city: 'İstanbul',
          country: 'Türkiye',
        },
      },
    },
  });

  // Admin 2
  const admin2 = await prisma.user.upsert({
    where: { email: 'admin2@muzayede.com' },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      email: 'admin2@muzayede.com',
      passwordHash: PASSWORD_HASH,
      role: UserRole.ADMIN,
      isVerified: true,
      language: 'tr',
      profile: {
        create: {
          firstName: 'Mehmet',
          lastName: 'Yılmaz',
          displayName: 'Mehmet Y.',
          city: 'Ankara',
          country: 'Türkiye',
        },
      },
    },
  });

  // Buyer 1
  const buyer1 = await prisma.user.upsert({
    where: { email: 'alici1@test.com' },
    update: {},
    create: {
      email: 'alici1@test.com',
      passwordHash: PASSWORD_HASH,
      role: UserRole.BUYER,
      isVerified: true,
      language: 'tr',
      trustScore: 72.0,
      kycStatus: 'APPROVED',
      profile: {
        create: {
          firstName: 'Ayşe',
          lastName: 'Demir',
          displayName: 'Ayşe D.',
          city: 'İstanbul',
          country: 'Türkiye',
          interests: ['tablolar', 'antikalar'],
        },
      },
    },
  });

  // Buyer 2
  const buyer2 = await prisma.user.upsert({
    where: { email: 'alici2@test.com' },
    update: {},
    create: {
      email: 'alici2@test.com',
      passwordHash: PASSWORD_HASH,
      role: UserRole.BUYER,
      isVerified: true,
      language: 'tr',
      trustScore: 65.0,
      kycStatus: 'APPROVED',
      profile: {
        create: {
          firstName: 'Can',
          lastName: 'Özkan',
          displayName: 'Can Ö.',
          city: 'İzmir',
          country: 'Türkiye',
          interests: ['heykeller', 'mucevher'],
        },
      },
    },
  });

  // Buyer 3
  const buyer3 = await prisma.user.upsert({
    where: { email: 'alici3@test.com' },
    update: {},
    create: {
      email: 'alici3@test.com',
      passwordHash: PASSWORD_HASH,
      role: UserRole.BUYER,
      isVerified: true,
      language: 'en',
      trustScore: 55.0,
      kycStatus: 'PENDING',
      profile: {
        create: {
          firstName: 'Elif',
          lastName: 'Kaya',
          displayName: 'Elif K.',
          city: 'Bursa',
          country: 'Türkiye',
          interests: ['saatler', 'mobilya'],
        },
      },
    },
  });

  // Seller 1
  const seller1 = await prisma.user.upsert({
    where: { email: 'satici1@test.com' },
    update: {},
    create: {
      email: 'satici1@test.com',
      passwordHash: PASSWORD_HASH,
      role: UserRole.SELLER,
      isVerified: true,
      language: 'tr',
      trustScore: 85.0,
      kycStatus: 'APPROVED',
      profile: {
        create: {
          firstName: 'Hasan',
          lastName: 'Çelik',
          displayName: 'Hasan Ç.',
          city: 'İstanbul',
          country: 'Türkiye',
        },
      },
    },
  });

  // Seller 1 - SellerProfile
  const seller1Profile = await prisma.sellerProfile.upsert({
    where: { userId: seller1.id },
    update: {},
    create: {
      userId: seller1.id,
      companyName: 'Çelik Sanat Galerisi',
      storeName: 'Çelik Sanat',
      storeSlug: 'celik-sanat',
      description: 'İstanbul merkezli çağdaş ve modern Türk sanatı galerisi.',
      website: 'https://celiksanat.com.tr',
      commissionRate: 0.10,
      performanceScore: 88.5,
      isApproved: true,
      approvedAt: new Date('2025-06-15'),
      bankIban: 'TR330006100519786457841326',
      bankName: 'Garanti BBVA',
      taxId: '1234567890',
    },
  });

  // Seller 2
  const seller2 = await prisma.user.upsert({
    where: { email: 'satici2@test.com' },
    update: {},
    create: {
      email: 'satici2@test.com',
      passwordHash: PASSWORD_HASH,
      role: UserRole.SELLER,
      isVerified: true,
      language: 'tr',
      trustScore: 78.0,
      kycStatus: 'APPROVED',
      profile: {
        create: {
          firstName: 'Zeynep',
          lastName: 'Arslan',
          displayName: 'Zeynep A.',
          city: 'Ankara',
          country: 'Türkiye',
        },
      },
    },
  });

  // Seller 2 - SellerProfile
  const seller2Profile = await prisma.sellerProfile.upsert({
    where: { userId: seller2.id },
    update: {},
    create: {
      userId: seller2.id,
      companyName: 'Arslan Antik',
      storeName: 'Arslan Antikacılık',
      storeSlug: 'arslan-antik',
      description: 'Osmanlı dönemi eserleri ve antika mobilya konusunda uzman.',
      commissionRate: 0.08,
      performanceScore: 76.0,
      isApproved: true,
      approvedAt: new Date('2025-09-10'),
      bankIban: 'TR250004600345678901234567',
      bankName: 'İş Bankası',
      taxId: '9876543210',
    },
  });

  // Auction House
  const auctionHouse = await prisma.user.upsert({
    where: { email: 'muzayedeevi@test.com' },
    update: {},
    create: {
      email: 'muzayedeevi@test.com',
      passwordHash: PASSWORD_HASH,
      role: UserRole.AUCTION_HOUSE,
      isVerified: true,
      language: 'tr',
      trustScore: 95.0,
      kycStatus: 'APPROVED',
      profile: {
        create: {
          firstName: 'Bosphorus',
          lastName: 'Auction',
          displayName: 'Bosphorus Müzayede Evi',
          city: 'İstanbul',
          country: 'Türkiye',
        },
      },
    },
  });

  // Auction House - SellerProfile
  const auctionHouseProfile = await prisma.sellerProfile.upsert({
    where: { userId: auctionHouse.id },
    update: {},
    create: {
      userId: auctionHouse.id,
      companyName: 'Bosphorus Müzayede A.Ş.',
      storeName: 'Bosphorus Müzayede',
      storeSlug: 'bosphorus-muzayede',
      logoUrl: '/images/stores/bosphorus-logo.png',
      bannerUrl: '/images/stores/bosphorus-banner.jpg',
      description: 'İstanbulun önde gelen müzayede evi. Türk ve uluslararası sanat eserleri.',
      website: 'https://bosphorusauction.com',
      socialMedia: { instagram: '@bosphorusauction', twitter: '@bosphorusauc' },
      commissionRate: 0.12,
      performanceScore: 95.0,
      isApproved: true,
      approvedAt: new Date('2025-01-10'),
      bankIban: 'TR120001000123456789012345',
      bankName: 'Ziraat Bankası',
      taxId: '5555555555',
    },
  });

  // ============================================================
  // 3. ARTISTS (5)
  // ============================================================
  console.log('Seeding artists...');

  const artistOsman = await prisma.artist.upsert({
    where: { slug: 'osman-hamdi-bey' },
    update: {},
    create: {
      name: 'Osman Hamdi Bey',
      slug: 'osman-hamdi-bey',
      biography:
        'Osmanlı dönemi ressam, entelektüel ve müze kurucusu. İstanbul Arkeoloji Müzesinin kurucusudur. Oryantalist tarzda çalışmalarıyla tanınır.',
      birthYear: 1842,
      deathYear: 1910,
      nationality: 'Türk',
      priceIndex: 98.5,
      photoUrl: '/images/artists/osman-hamdi-bey.jpg',
    },
  });

  const artistFikret = await prisma.artist.upsert({
    where: { slug: 'fikret-mualla' },
    update: {},
    create: {
      name: 'Fikret Mualla',
      slug: 'fikret-mualla',
      biography:
        'Ekspresyonist Türk ressam. Hayatının büyük bölümünü Pariste geçirmiştir. Canlı renkleri ve özgün tarzıyla bilinir.',
      birthYear: 1903,
      deathYear: 1967,
      nationality: 'Türk',
      priceIndex: 82.0,
      photoUrl: '/images/artists/fikret-mualla.jpg',
    },
  });

  const artistFahrelnissa = await prisma.artist.upsert({
    where: { slug: 'fahrelnissa-zeid' },
    update: {},
    create: {
      name: 'Fahrelnissa Zeid',
      slug: 'fahrelnissa-zeid',
      biography:
        'Türk soyut sanatçı. Osmanlı hanedanına mensup olup büyük ölçekli soyut kaleidoskopik kompozisyonlarıyla tanınır.',
      birthYear: 1901,
      deathYear: 1991,
      nationality: 'Türk',
      priceIndex: 91.0,
      photoUrl: '/images/artists/fahrelnissa-zeid.jpg',
    },
  });

  const artistBanksy = await prisma.artist.upsert({
    where: { slug: 'banksy' },
    update: {},
    create: {
      name: 'Banksy',
      slug: 'banksy',
      biography:
        'Anonim İngiliz sokak sanatçısı, politik aktivist ve film yönetmeni. Dünya genelinde grafiti ve sokak sanatı eserleriyle tanınır.',
      birthYear: 1974,
      deathYear: null,
      nationality: 'İngiliz',
      priceIndex: 95.0,
      photoUrl: '/images/artists/banksy.jpg',
    },
  });

  const artistAiWeiwei = await prisma.artist.upsert({
    where: { slug: 'ai-weiwei' },
    update: {},
    create: {
      name: 'Ai Weiwei',
      slug: 'ai-weiwei',
      biography:
        'Çinli çağdaş sanatçı, aktivist ve mimar. Heykel, enstalasyon, mimari, fotoğraf ve film alanlarında çalışmalar yapmaktadır.',
      birthYear: 1957,
      deathYear: null,
      nationality: 'Çinli',
      priceIndex: 88.0,
      photoUrl: '/images/artists/ai-weiwei.jpg',
    },
  });

  // ============================================================
  // 4. TAGS (10)
  // ============================================================
  console.log('Seeding tags...');

  const tagData = [
    { name: 'Osmanlı', slug: 'osmanli' },
    { name: 'Modern Sanat', slug: 'modern-sanat' },
    { name: 'Çağdaş', slug: 'cagdas' },
    { name: 'Koleksiyon', slug: 'koleksiyon' },
    { name: 'Nadir', slug: 'nadir' },
    { name: 'İmzalı', slug: 'imzali' },
    { name: 'Sertifikalı', slug: 'sertifikali' },
    { name: 'Orijinal', slug: 'orijinal' },
    { name: 'Restoreli', slug: 'restoreli' },
    { name: 'Yatırım', slug: 'yatirim' },
  ];

  const tags: Record<string, string> = {};
  for (const t of tagData) {
    const tag = await prisma.tag.upsert({
      where: { slug: t.slug },
      update: {},
      create: t,
    });
    tags[tag.slug] = tag.id;
  }

  // ============================================================
  // 5. PRODUCTS (20+)
  // ============================================================
  console.log('Seeding products...');

  // Helper to create a product with media and attributes
  async function createProduct(data: {
    title: string;
    slug: string;
    shortDescription: string;
    descriptionHtml: string;
    categorySlug: string;
    condition: ProductCondition;
    estimateLow: number;
    estimateHigh: number;
    sellerId: string;
    artistId?: string;
    media: { url: string; isPrimary: boolean }[];
    attributes: { key: string; value: string }[];
    tagSlugs?: string[];
  }) {
    const product = await prisma.product.create({
      data: {
        title: data.title,
        slug: data.slug,
        shortDescription: data.shortDescription,
        descriptionHtml: data.descriptionHtml,
        categoryId: categories[data.categorySlug],
        condition: data.condition,
        estimateLow: data.estimateLow,
        estimateHigh: data.estimateHigh,
        sellerId: data.sellerId,
        artistId: data.artistId,
        media: {
          create: data.media.map((m, i) => ({
            type: MediaType.IMAGE,
            url: m.url,
            thumbnailUrl: m.url.replace('.jpg', '-thumb.jpg'),
            sortOrder: i,
            isPrimary: m.isPrimary,
          })),
        },
        attributes: {
          create: data.attributes,
        },
        tags: data.tagSlugs
          ? {
              create: data.tagSlugs
                .filter((s) => tags[s])
                .map((s) => ({ tagId: tags[s] })),
            }
          : undefined,
      },
    });
    return product;
  }

  // --- PAINTINGS (5) ---
  const p1 = await createProduct({
    title: 'Kaplumbağa Terbiyecisi',
    slug: 'kaplumbaga-terbiyecisi',
    shortDescription: 'Osman Hamdi Bey\'in ikonik eseri, tuval üzerine yağlıboya.',
    descriptionHtml: '<p>Osman Hamdi Bey\'in 1906 tarihli ünlü eseri <strong>Kaplumbağa Terbiyecisi</strong>. Oryantalist Osmanlı tarzının en önemli örneklerinden biri. Eser, bir dervişin kaplumbağaları eğitmeye çalışmasını betimler.</p><p>Tuval üzerine yağlıboya, 221.5 x 120 cm.</p>',
    categorySlug: 'tablolar',
    condition: ProductCondition.RESTORED,
    estimateLow: 5000000,
    estimateHigh: 8000000,
    sellerId: auctionHouse.id,
    artistId: artistOsman.id,
    media: [
      { url: '/images/products/kaplumbaga-terbiyecisi.jpg', isPrimary: true },
      { url: '/images/products/kaplumbaga-terbiyecisi-detail.jpg', isPrimary: false },
    ],
    attributes: [
      { key: 'boyut', value: '221.5 x 120 cm' },
      { key: 'malzeme', value: 'Tuval üzerine yağlıboya' },
      { key: 'dönem', value: '1906' },
      { key: 'imza', value: 'Sağ alt köşe' },
    ],
    tagSlugs: ['osmanli', 'orijinal', 'nadir', 'yatirim'],
  });

  const p2 = await createProduct({
    title: 'Paris Cafe Sahnesi',
    slug: 'paris-cafe-sahnesi',
    shortDescription: 'Fikret Mualla\'nın karakteristik Paris kafe tablosu.',
    descriptionHtml: '<p>Fikret Mualla\'nın Parisdeki yaşamından ilham alan, canlı renkleriyle dikkat çeken <strong>kafe sahnesi</strong>. Ekspresyonist üslubun güçlü bir örneği.</p>',
    categorySlug: 'tablolar',
    condition: ProductCondition.USED,
    estimateLow: 800000,
    estimateHigh: 1200000,
    sellerId: seller1.id,
    artistId: artistFikret.id,
    media: [
      { url: '/images/products/paris-cafe-sahnesi.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '65 x 50 cm' },
      { key: 'malzeme', value: 'Kağıt üzerine guvaş' },
      { key: 'dönem', value: '1955' },
      { key: 'imza', value: 'Sol alt köşe' },
    ],
    tagSlugs: ['modern-sanat', 'imzali', 'orijinal'],
  });

  const p3 = await createProduct({
    title: 'Soyut Kompozisyon No. 7',
    slug: 'soyut-kompozisyon-no-7',
    shortDescription: 'Fahrelnissa Zeid\'in büyük ölçekli soyut eseri.',
    descriptionHtml: '<p>Fahrelnissa Zeid\'in kaleidoskopik soyut kompozisyonlarından biri. Canlı renk paletleri ve karmaşık geometrik formlar içerir.</p>',
    categorySlug: 'tablolar',
    condition: ProductCondition.USED,
    estimateLow: 2000000,
    estimateHigh: 3500000,
    sellerId: auctionHouse.id,
    artistId: artistFahrelnissa.id,
    media: [
      { url: '/images/products/soyut-kompozisyon-no-7.jpg', isPrimary: true },
      { url: '/images/products/soyut-kompozisyon-no-7-detail.jpg', isPrimary: false },
    ],
    attributes: [
      { key: 'boyut', value: '200 x 300 cm' },
      { key: 'malzeme', value: 'Tuval üzerine yağlıboya' },
      { key: 'dönem', value: '1960' },
    ],
    tagSlugs: ['modern-sanat', 'orijinal', 'yatirim', 'nadir'],
  });

  const p4 = await createProduct({
    title: 'Girl with Balloon - Signed Print',
    slug: 'girl-with-balloon-signed-print',
    shortDescription: 'Banksy\'nin ikonik Girl with Balloon eserinin imzalı baskısı.',
    descriptionHtml: '<p><strong>Girl with Balloon</strong> - Banksy\'nin en bilinen eserlerinden birinin sınırlı sayıda üretilmiş imzalı baskısı. 150 adetlik seriden 42 numaralı eser.</p>',
    categorySlug: 'tablolar',
    condition: ProductCondition.NEW,
    estimateLow: 1500000,
    estimateHigh: 2500000,
    sellerId: seller1.id,
    artistId: artistBanksy.id,
    media: [
      { url: '/images/products/girl-with-balloon-signed-print.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '70 x 50 cm' },
      { key: 'malzeme', value: 'Kağıt üzerine serigrafi' },
      { key: 'dönem', value: '2004' },
      { key: 'imza', value: 'Sağ alt köşe, kurşun kalem' },
      { key: 'edisyon', value: '42/150' },
    ],
    tagSlugs: ['cagdas', 'imzali', 'sertifikali', 'yatirim'],
  });

  const p5 = await createProduct({
    title: 'Silhouette Serisi - İstanbul',
    slug: 'silhouette-serisi-istanbul',
    shortDescription: 'Ai Weiwei\'nin İstanbul silüetini konu alan çağdaş tablosu.',
    descriptionHtml: '<p>Ai Weiwei\'nin İstanbul\'a özgü manzara silüetlerini yorumladığı çağdaş eser. Karışık teknik.</p>',
    categorySlug: 'tablolar',
    condition: ProductCondition.NEW,
    estimateLow: 3000000,
    estimateHigh: 4500000,
    sellerId: auctionHouse.id,
    artistId: artistAiWeiwei.id,
    media: [
      { url: '/images/products/silhouette-serisi-istanbul.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '180 x 120 cm' },
      { key: 'malzeme', value: 'Karışık teknik' },
      { key: 'dönem', value: '2023' },
    ],
    tagSlugs: ['cagdas', 'orijinal', 'yatirim'],
  });

  // --- SCULPTURES (3) ---
  const p6 = await createProduct({
    title: 'Bronz Semazen Heykeli',
    slug: 'bronz-semazen-heykeli',
    shortDescription: '19. yüzyıl Osmanlı dönemi bronz semazen figürü.',
    descriptionHtml: '<p>Osmanlı dönemi el yapımı <strong>bronz semazen heykeli</strong>. Mevlevi geleneğini yansıtan detaylı işçilik.</p>',
    categorySlug: 'heykeller',
    condition: ProductCondition.RESTORED,
    estimateLow: 150000,
    estimateHigh: 250000,
    sellerId: seller2.id,
    media: [
      { url: '/images/products/bronz-semazen-heykeli.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '45 x 20 x 20 cm' },
      { key: 'malzeme', value: 'Bronz' },
      { key: 'dönem', value: '19. yüzyıl' },
      { key: 'ağırlık', value: '3.2 kg' },
    ],
    tagSlugs: ['osmanli', 'restoreli', 'koleksiyon'],
  });

  const p7 = await createProduct({
    title: 'Mermer Afrodit Büstü',
    slug: 'mermer-afrodit-bustu',
    shortDescription: 'Roma dönemi reprodüksiyon mermer büst.',
    descriptionHtml: '<p>Roma dönemi Afrodit büstünün 18. yüzyıl İtalyan atölye reprodüksiyonu. Carrara mermeri.</p>',
    categorySlug: 'heykeller',
    condition: ProductCondition.USED,
    estimateLow: 300000,
    estimateHigh: 500000,
    sellerId: auctionHouse.id,
    media: [
      { url: '/images/products/mermer-afrodit-bustu.jpg', isPrimary: true },
      { url: '/images/products/mermer-afrodit-bustu-side.jpg', isPrimary: false },
    ],
    attributes: [
      { key: 'boyut', value: '60 x 30 x 25 cm' },
      { key: 'malzeme', value: 'Carrara mermeri' },
      { key: 'dönem', value: '18. yüzyıl' },
      { key: 'ağırlık', value: '18 kg' },
    ],
    tagSlugs: ['koleksiyon', 'nadir'],
  });

  const p8 = await createProduct({
    title: 'Çağdaş Çelik Heykel - Rüzgar',
    slug: 'cagdas-celik-heykel-ruzgar',
    shortDescription: 'Paslanmaz çelikten modern kinetik heykel.',
    descriptionHtml: '<p>Rüzgarla hareket eden kinetik çelik heykel. Bahçe veya geniş mekanlar için ideal.</p>',
    categorySlug: 'heykeller',
    condition: ProductCondition.NEW,
    estimateLow: 120000,
    estimateHigh: 200000,
    sellerId: seller1.id,
    media: [
      { url: '/images/products/cagdas-celik-heykel-ruzgar.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '150 x 80 x 80 cm' },
      { key: 'malzeme', value: 'Paslanmaz çelik' },
      { key: 'ağırlık', value: '35 kg' },
    ],
    tagSlugs: ['cagdas', 'orijinal'],
  });

  // --- ANTIQUES (3) ---
  const p9 = await createProduct({
    title: 'Osmanlı Sedef Kakma Kuran Kutusu',
    slug: 'osmanli-sedef-kakma-kuran-kutusu',
    shortDescription: '18. yüzyıl Osmanlı sedef kakma el işi kutu.',
    descriptionHtml: '<p>Osmanlı dönemi sedef ve bağa kakma <strong>Kuran kutusu</strong>. Üstün el işçiliği ve nadir bulunan parça.</p>',
    categorySlug: 'antikalar',
    condition: ProductCondition.RESTORED,
    estimateLow: 200000,
    estimateHigh: 350000,
    sellerId: seller2.id,
    media: [
      { url: '/images/products/osmanli-sedef-kakma-kuran-kutusu.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '35 x 25 x 12 cm' },
      { key: 'malzeme', value: 'Ceviz, sedef, bağa' },
      { key: 'dönem', value: '18. yüzyıl' },
    ],
    tagSlugs: ['osmanli', 'restoreli', 'nadir', 'sertifikali'],
  });

  const p10 = await createProduct({
    title: 'İznik Çini Tabak - Lale Motifli',
    slug: 'iznik-cini-tabak-lale-motifli',
    shortDescription: '16. yüzyıl İznik çini tabak, lale ve karanfil motifleri.',
    descriptionHtml: '<p>16. yüzyıl <strong>İznik çini tabağı</strong>. Klasik lale, karanfil ve rumi motiflerle süslü. Kobalt mavisi ve mercan kırmızısı baskın renkler.</p>',
    categorySlug: 'antikalar',
    condition: ProductCondition.USED,
    estimateLow: 500000,
    estimateHigh: 800000,
    sellerId: auctionHouse.id,
    media: [
      { url: '/images/products/iznik-cini-tabak-lale-motifli.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: 'Çap: 32 cm' },
      { key: 'malzeme', value: 'Seramik, sır altı boyama' },
      { key: 'dönem', value: '16. yüzyıl' },
    ],
    tagSlugs: ['osmanli', 'nadir', 'koleksiyon', 'orijinal'],
  });

  const p11 = await createProduct({
    title: 'Art Deco Masa Saati',
    slug: 'art-deco-masa-saati',
    shortDescription: '1920\'ler Fransız Art Deco bronz ve mermer masa saati.',
    descriptionHtml: '<p>1920\'ler dönemine ait <strong>Art Deco masa saati</strong>. Bronz figür ve mermer kaide. Mekanik mekanizma çalışır durumda.</p>',
    categorySlug: 'antikalar',
    condition: ProductCondition.RESTORED,
    estimateLow: 80000,
    estimateHigh: 120000,
    sellerId: seller2.id,
    media: [
      { url: '/images/products/art-deco-masa-saati.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '40 x 30 x 15 cm' },
      { key: 'malzeme', value: 'Bronz, mermer' },
      { key: 'dönem', value: '1920\'ler' },
      { key: 'mekanizma', value: 'Mekanik, çalışır durumda' },
    ],
    tagSlugs: ['koleksiyon', 'restoreli'],
  });

  // --- JEWELRY (2) ---
  const p12 = await createProduct({
    title: 'Osmanlı Elmas Broş',
    slug: 'osmanli-elmas-bros',
    shortDescription: '19. yüzyıl Osmanlı saray elmas broşu, altın montür.',
    descriptionHtml: '<p>Osmanlı saray koleksiyonundan <strong>elmas broş</strong>. 18 ayar altın montür üzerine toplam 3.5 karat pırlanta. Saray yapımı.</p>',
    categorySlug: 'mucevher',
    condition: ProductCondition.USED,
    estimateLow: 400000,
    estimateHigh: 600000,
    sellerId: auctionHouse.id,
    media: [
      { url: '/images/products/osmanli-elmas-bros.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'malzeme', value: '18 ayar altın, pırlanta' },
      { key: 'karat', value: '3.5 ct toplam' },
      { key: 'dönem', value: '19. yüzyıl' },
      { key: 'ağırlık', value: '28 gram' },
    ],
    tagSlugs: ['osmanli', 'nadir', 'sertifikali', 'yatirim'],
  });

  const p13 = await createProduct({
    title: 'Art Nouveau Yakut Kolye',
    slug: 'art-nouveau-yakut-kolye',
    shortDescription: 'Erken 20. yüzyıl Art Nouveau tarzı yakut ve altın kolye.',
    descriptionHtml: '<p>Art Nouveau tarzında tasarlanmış <strong>yakut ve altın kolye</strong>. Doğal Burma yakutu, 14 ayar altın zincir ve çiçek motifli pandantif.</p>',
    categorySlug: 'mucevher',
    condition: ProductCondition.RESTORED,
    estimateLow: 250000,
    estimateHigh: 400000,
    sellerId: seller1.id,
    media: [
      { url: '/images/products/art-nouveau-yakut-kolye.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'malzeme', value: '14 ayar altın, doğal yakut' },
      { key: 'karat', value: '2.1 ct yakut' },
      { key: 'dönem', value: '1910\'lar' },
      { key: 'uzunluk', value: '45 cm zincir' },
    ],
    tagSlugs: ['koleksiyon', 'sertifikali', 'restoreli'],
  });

  // --- WATCHES (2) ---
  const p14 = await createProduct({
    title: 'Patek Philippe Calatrava 1950',
    slug: 'patek-philippe-calatrava-1950',
    shortDescription: 'Patek Philippe Calatrava Ref. 96, 1950 üretim, altın kasa.',
    descriptionHtml: '<p><strong>Patek Philippe Calatrava Ref. 96</strong>, 1950 yılı üretimi. 18 ayar sarı altın kasa, orijinal kadran, elle kurmalı kalibr. Saat koleksiyoncuları için benzersiz bir fırsat.</p>',
    categorySlug: 'saatler',
    condition: ProductCondition.USED,
    estimateLow: 1000000,
    estimateHigh: 1500000,
    sellerId: auctionHouse.id,
    media: [
      { url: '/images/products/patek-philippe-calatrava-1950.jpg', isPrimary: true },
      { url: '/images/products/patek-philippe-calatrava-1950-back.jpg', isPrimary: false },
    ],
    attributes: [
      { key: 'malzeme', value: '18 ayar sarı altın' },
      { key: 'çap', value: '33 mm' },
      { key: 'mekanizma', value: 'Kalibr 12-120, elle kurma' },
      { key: 'dönem', value: '1950' },
      { key: 'referans', value: 'Ref. 96' },
    ],
    tagSlugs: ['nadir', 'sertifikali', 'orijinal', 'yatirim'],
  });

  const p15 = await createProduct({
    title: 'Omega Seamaster 300 Vintage',
    slug: 'omega-seamaster-300-vintage',
    shortDescription: '1960\'lar Omega Seamaster 300, çelik kasa, dalış saati.',
    descriptionHtml: '<p><strong>Omega Seamaster 300</strong> vintage dalış saati. 1960\'lar üretimi, paslanmaz çelik kasa, orijinal kadran ve akrep takımı.</p>',
    categorySlug: 'saatler',
    condition: ProductCondition.USED,
    estimateLow: 350000,
    estimateHigh: 500000,
    sellerId: seller1.id,
    media: [
      { url: '/images/products/omega-seamaster-300-vintage.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'malzeme', value: 'Paslanmaz çelik' },
      { key: 'çap', value: '39 mm' },
      { key: 'mekanizma', value: 'Kalibr 552, otomatik' },
      { key: 'dönem', value: '1960\'lar' },
    ],
    tagSlugs: ['koleksiyon', 'orijinal'],
  });

  // --- FURNITURE (2) ---
  const p16 = await createProduct({
    title: 'Osmanlı Sedef Kakma Sehpa',
    slug: 'osmanli-sedef-kakma-sehpa',
    shortDescription: '19. yüzyıl Osmanlı sedef kakma altıgen sehpa.',
    descriptionHtml: '<p>Osmanlı dönemi <strong>sedef kakma altıgen sehpa</strong>. Ceviz ağacı üzerine geometrik sedef ve fildişi kakma. Orijinal durumda.</p>',
    categorySlug: 'mobilya',
    condition: ProductCondition.RESTORED,
    estimateLow: 180000,
    estimateHigh: 280000,
    sellerId: seller2.id,
    media: [
      { url: '/images/products/osmanli-sedef-kakma-sehpa.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '60 x 60 x 55 cm' },
      { key: 'malzeme', value: 'Ceviz, sedef, fildişi' },
      { key: 'dönem', value: '19. yüzyıl' },
    ],
    tagSlugs: ['osmanli', 'restoreli', 'koleksiyon'],
  });

  const p17 = await createProduct({
    title: 'Louis XVI Stil Bergere Koltuk',
    slug: 'louis-xvi-stil-bergere-koltuk',
    shortDescription: 'Louis XVI tarzı altın varaklı bergere koltuk, ipek döşeme.',
    descriptionHtml: '<p>Fransız <strong>Louis XVI tarzı bergere koltuk</strong>. Altın varaklı ahşap çerçeve, el dokuması ipek döşeme. 19. yüzyıl Fransız yapımı.</p>',
    categorySlug: 'mobilya',
    condition: ProductCondition.RESTORED,
    estimateLow: 120000,
    estimateHigh: 180000,
    sellerId: auctionHouse.id,
    media: [
      { url: '/images/products/louis-xvi-stil-bergere-koltuk.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '75 x 70 x 100 cm' },
      { key: 'malzeme', value: 'Kayın ağacı, altın varak, ipek' },
      { key: 'dönem', value: '19. yüzyıl' },
    ],
    tagSlugs: ['koleksiyon', 'restoreli'],
  });

  // --- CARPETS / TEXTILES (2) ---
  const p18 = await createProduct({
    title: 'Hereke İpek Halı - Saray Deseni',
    slug: 'hereke-ipek-hali-saray-deseni',
    shortDescription: 'Hereke dokuma ipek halı, saray deseni, 1920\'ler.',
    descriptionHtml: '<p><strong>Hereke ipek halı</strong>, saray deseni. 1920\'ler dönemine ait, 1 milyon düğüm/m² yoğunluk. Madalyon ve köşelik motifli, kırmızı ve lacivert ana renkler.</p>',
    categorySlug: 'hali-tekstil',
    condition: ProductCondition.USED,
    estimateLow: 600000,
    estimateHigh: 900000,
    sellerId: auctionHouse.id,
    media: [
      { url: '/images/products/hereke-ipek-hali-saray-deseni.jpg', isPrimary: true },
      { url: '/images/products/hereke-ipek-hali-saray-deseni-detail.jpg', isPrimary: false },
    ],
    attributes: [
      { key: 'boyut', value: '200 x 300 cm' },
      { key: 'malzeme', value: 'Saf ipek' },
      { key: 'dönem', value: '1920\'ler' },
      { key: 'düğüm yoğunluğu', value: '1.000.000/m²' },
      { key: 'menşe', value: 'Hereke' },
    ],
    tagSlugs: ['osmanli', 'nadir', 'orijinal', 'yatirim'],
  });

  const p19 = await createProduct({
    title: 'Antik Uşak Halısı',
    slug: 'antik-usak-halisi',
    shortDescription: '18. yüzyıl Uşak yün halısı, yıldız motifli.',
    descriptionHtml: '<p>18. yüzyıl <strong>Uşak yıldız halısı</strong>. Doğal boyalarla renklendirilmiş yün iplik. Anadolu halı sanatının önemli örneklerinden.</p>',
    categorySlug: 'hali-tekstil',
    condition: ProductCondition.RESTORED,
    estimateLow: 250000,
    estimateHigh: 400000,
    sellerId: seller2.id,
    media: [
      { url: '/images/products/antik-usak-halisi.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '180 x 250 cm' },
      { key: 'malzeme', value: 'Yün, doğal boya' },
      { key: 'dönem', value: '18. yüzyıl' },
      { key: 'menşe', value: 'Uşak' },
    ],
    tagSlugs: ['osmanli', 'restoreli', 'nadir', 'koleksiyon'],
  });

  // --- OTHER (2) ---
  const p20 = await createProduct({
    title: 'Osmanlı Hat Sanatı - Besmele',
    slug: 'osmanli-hat-sanati-besmele',
    shortDescription: 'Hattat Hamid Aytaç\'ın celî sülüs besmele levhası.',
    descriptionHtml: '<p>Hattat Hamid Aytaç\'ın <strong>celî sülüs besmele levhası</strong>. Altın tezhipli, el yapımı ebru zemin üzerine.</p>',
    categorySlug: 'kitap-el-yazmalari',
    condition: ProductCondition.USED,
    estimateLow: 150000,
    estimateHigh: 250000,
    sellerId: seller1.id,
    media: [
      { url: '/images/products/osmanli-hat-sanati-besmele.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: '50 x 70 cm' },
      { key: 'malzeme', value: 'Kağıt, altın, mürekkep' },
      { key: 'dönem', value: '1950\'ler' },
      { key: 'imza', value: 'Hamid Aytaç' },
    ],
    tagSlugs: ['osmanli', 'imzali', 'orijinal', 'koleksiyon'],
  });

  const p21 = await createProduct({
    title: 'İznik Seramik Vazo Çifti',
    slug: 'iznik-seramik-vazo-cifti',
    shortDescription: '17. yüzyıl tarzı İznik seramik vazo çifti.',
    descriptionHtml: '<p>İznik tarzı <strong>seramik vazo çifti</strong>. Geleneksel çini motiflerle süslü, kobalt mavisi ve turkuaz hakimiyetinde.</p>',
    categorySlug: 'seramik-cam',
    condition: ProductCondition.NEW,
    estimateLow: 45000,
    estimateHigh: 75000,
    sellerId: seller2.id,
    media: [
      { url: '/images/products/iznik-seramik-vazo-cifti.jpg', isPrimary: true },
    ],
    attributes: [
      { key: 'boyut', value: 'Her biri yükseklik 40 cm, çap 18 cm' },
      { key: 'malzeme', value: 'Seramik, sır altı boyama' },
      { key: 'adet', value: '2 (çift)' },
    ],
    tagSlugs: ['orijinal'],
  });

  const allProducts = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21];

  // ============================================================
  // 6. AUCTIONS (10)
  // ============================================================
  console.log('Seeding auctions...');

  // Auction 1 - ENGLISH / LIVE
  const auction1 = await prisma.auction.create({
    data: {
      title: 'Bahar Klasik Sanat Müzayedesi',
      slug: 'bahar-klasik-sanat-muzayedesi',
      description: 'Osmanlı dönemi ve Cumhuriyet dönemi eserlerinden oluşan prestijli sanat müzayedesi.',
      type: AuctionType.ENGLISH,
      status: AuctionStatus.LIVE,
      startPrice: 100000,
      reservePrice: 500000,
      currentPrice: 850000,
      minIncrement: 10000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-02-25T14:00:00Z'),
      endDate: new Date('2026-03-01T20:00:00Z'),
      bidCount: 18,
      viewCount: 1250,
      coverImageUrl: '/images/auctions/bahar-klasik-sanat.jpg',
      createdBy: auctionHouse.id,
      auctionHouseId: auctionHouseProfile.id,
    },
  });

  // Auction 2 - ENGLISH / PUBLISHED
  const auction2 = await prisma.auction.create({
    data: {
      title: 'Modern Türk Sanatı Seçkisi',
      slug: 'modern-turk-sanati-seckisi',
      description: '20. yüzyıl Türk ressamlarının nadide eserlerinden oluşan özel seçki.',
      type: AuctionType.ENGLISH,
      status: AuctionStatus.PUBLISHED,
      startPrice: 50000,
      reservePrice: 200000,
      minIncrement: 5000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-03-10T14:00:00Z'),
      endDate: new Date('2026-03-15T20:00:00Z'),
      viewCount: 320,
      coverImageUrl: '/images/auctions/modern-turk-sanati.jpg',
      createdBy: seller1.id,
    },
  });

  // Auction 3 - ENGLISH / COMPLETED
  const auction3 = await prisma.auction.create({
    data: {
      title: 'Kış Antika ve Mücevher Müzayedesi',
      slug: 'kis-antika-mucevher-muzayedesi',
      description: 'Osmanlı antika eserleri ve saray mücevherlerinin sunulduğu özel müzayede.',
      type: AuctionType.ENGLISH,
      status: AuctionStatus.COMPLETED,
      startPrice: 80000,
      reservePrice: 300000,
      reserveMet: true,
      currentPrice: 620000,
      minIncrement: 10000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-02-01T14:00:00Z'),
      endDate: new Date('2026-02-05T20:00:00Z'),
      actualEndDate: new Date('2026-02-05T20:12:00Z'),
      bidCount: 32,
      viewCount: 2100,
      coverImageUrl: '/images/auctions/kis-antika-mucevher.jpg',
      createdBy: auctionHouse.id,
      auctionHouseId: auctionHouseProfile.id,
    },
  });

  // Auction 4 - TIMED / LIVE
  const auction4 = await prisma.auction.create({
    data: {
      title: 'Online Saat Koleksiyonu',
      slug: 'online-saat-koleksiyonu',
      description: 'Vintage ve lüks saat koleksiyonundan seçme parçalar.',
      type: AuctionType.TIMED,
      status: AuctionStatus.LIVE,
      startPrice: 50000,
      reservePrice: 150000,
      currentPrice: 380000,
      minIncrement: 5000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-02-24T10:00:00Z'),
      endDate: new Date('2026-03-02T22:00:00Z'),
      bidCount: 12,
      viewCount: 890,
      coverImageUrl: '/images/auctions/online-saat-koleksiyonu.jpg',
      createdBy: seller1.id,
    },
  });

  // Auction 5 - TIMED / PRE_BID
  const auction5 = await prisma.auction.create({
    data: {
      title: 'Çağdaş Sanat Online Müzayedesi',
      slug: 'cagdas-sanat-online-muzayedesi',
      description: 'Yerli ve yabancı çağdaş sanatçılardan seçkin eserler.',
      type: AuctionType.TIMED,
      status: AuctionStatus.PRE_BID,
      startPrice: 100000,
      reservePrice: 500000,
      minIncrement: 10000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-03-05T10:00:00Z'),
      endDate: new Date('2026-03-12T22:00:00Z'),
      viewCount: 145,
      coverImageUrl: '/images/auctions/cagdas-sanat-online.jpg',
      createdBy: auctionHouse.id,
      auctionHouseId: auctionHouseProfile.id,
    },
  });

  // Auction 6 - DUTCH / PUBLISHED
  const auction6 = await prisma.auction.create({
    data: {
      title: 'Hollanda Usulü Mobilya Müzayedesi',
      slug: 'hollanda-usulu-mobilya-muzayedesi',
      description: 'Antika mobilya ve dekoratif eşyalar Hollanda usulü açık artırma ile sunuluyor.',
      type: AuctionType.DUTCH,
      status: AuctionStatus.PUBLISHED,
      startPrice: 200000,
      minIncrement: 5000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      dutchStartPrice: 300000,
      dutchDecrement: 5000,
      dutchDecrementInterval: 300,
      currency: 'TRY',
      startDate: new Date('2026-03-08T14:00:00Z'),
      endDate: new Date('2026-03-08T18:00:00Z'),
      viewCount: 210,
      coverImageUrl: '/images/auctions/hollanda-mobilya.jpg',
      createdBy: seller2.id,
    },
  });

  // Auction 7 - SEALED_BID / LIVE
  const auction7 = await prisma.auction.create({
    data: {
      title: 'Kapalı Zarf Nadir Eserler',
      slug: 'kapali-zarf-nadir-eserler',
      description: 'Çok nadir bulunan eserlerin kapalı zarf usulü ile müzayedesi.',
      type: AuctionType.SEALED_BID,
      status: AuctionStatus.LIVE,
      startPrice: 500000,
      minIncrement: 50000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-02-20T10:00:00Z'),
      endDate: new Date('2026-03-05T18:00:00Z'),
      bidCount: 6,
      viewCount: 540,
      coverImageUrl: '/images/auctions/kapali-zarf-nadir.jpg',
      createdBy: auctionHouse.id,
      auctionHouseId: auctionHouseProfile.id,
    },
  });

  // Auction 8 - VICKREY / DRAFT
  const auction8 = await prisma.auction.create({
    data: {
      title: 'İkinci Fiyat Dijital Sanat',
      slug: 'ikinci-fiyat-dijital-sanat',
      description: 'Dijital sanat eserlerinin ikinci fiyat (Vickrey) müzayedesi.',
      type: AuctionType.VICKREY,
      status: AuctionStatus.DRAFT,
      startPrice: 20000,
      minIncrement: 2000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-04-01T10:00:00Z'),
      endDate: new Date('2026-04-05T20:00:00Z'),
      coverImageUrl: '/images/auctions/dijital-sanat-vickrey.jpg',
      createdBy: admin1.id,
    },
  });

  // Auction 9 - HYBRID / PUBLISHED
  const auction9 = await prisma.auction.create({
    data: {
      title: 'Hibrit Halı ve Tekstil Müzayedesi',
      slug: 'hibrit-hali-tekstil-muzayedesi',
      description: 'Anadolu halıları ve tekstil sanatı eserlerinin ön pey ve salon kombinasyonu müzayedesi.',
      type: AuctionType.HYBRID,
      status: AuctionStatus.PUBLISHED,
      startPrice: 50000,
      reservePrice: 200000,
      minIncrement: 5000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-03-15T14:00:00Z'),
      endDate: new Date('2026-03-15T20:00:00Z'),
      isLiveStreaming: true,
      viewCount: 75,
      coverImageUrl: '/images/auctions/hibrit-hali-tekstil.jpg',
      createdBy: auctionHouse.id,
      auctionHouseId: auctionHouseProfile.id,
    },
  });

  // Auction 10 - COMPLETED (second completed auction)
  const auction10 = await prisma.auction.create({
    data: {
      title: 'Şubat Heykel ve Seramik Müzayedesi',
      slug: 'subat-heykel-seramik-muzayedesi',
      description: 'Bronz heykeller, seramik eserler ve cam sanatından oluşan özel müzayede.',
      type: AuctionType.ENGLISH,
      status: AuctionStatus.COMPLETED,
      startPrice: 30000,
      reservePrice: 100000,
      reserveMet: true,
      currentPrice: 280000,
      minIncrement: 5000,
      buyerCommissionRate: 0.05,
      sellerCommissionRate: 0.10,
      currency: 'TRY',
      startDate: new Date('2026-02-10T14:00:00Z'),
      endDate: new Date('2026-02-14T20:00:00Z'),
      actualEndDate: new Date('2026-02-14T20:08:00Z'),
      bidCount: 22,
      viewCount: 1560,
      coverImageUrl: '/images/auctions/subat-heykel-seramik.jpg',
      createdBy: seller2.id,
    },
  });

  // ============================================================
  // 7. BID INCREMENTS
  // ============================================================
  console.log('Seeding bid increments...');

  const allAuctions = [auction1, auction2, auction3, auction4, auction5, auction6, auction7, auction8, auction9, auction10];

  for (const auc of allAuctions) {
    await prisma.bidIncrement.createMany({
      data: [
        { auctionId: auc.id, priceFrom: 0, priceTo: 50000, incrementAmount: 1000 },
        { auctionId: auc.id, priceFrom: 50000, priceTo: 200000, incrementAmount: 5000 },
        { auctionId: auc.id, priceFrom: 200000, priceTo: 1000000, incrementAmount: 10000 },
        { auctionId: auc.id, priceFrom: 1000000, priceTo: 99999999, incrementAmount: 50000 },
      ],
    });
  }

  // ============================================================
  // 8. AUCTION LOTS
  // ============================================================
  console.log('Seeding auction lots...');

  // Auction 1 (LIVE) - Classic Art: p1, p3, p10
  const lot1_1 = await prisma.auctionLot.create({ data: { auctionId: auction1.id, productId: p1.id, lotNumber: 1, sortOrder: 1, status: 'active' } });
  const lot1_2 = await prisma.auctionLot.create({ data: { auctionId: auction1.id, productId: p3.id, lotNumber: 2, sortOrder: 2, status: 'pending' } });
  const lot1_3 = await prisma.auctionLot.create({ data: { auctionId: auction1.id, productId: p10.id, lotNumber: 3, sortOrder: 3, status: 'pending' } });

  // Auction 2 (PUBLISHED) - Modern Turkish Art: p2, p5
  await prisma.auctionLot.create({ data: { auctionId: auction2.id, productId: p2.id, lotNumber: 1, sortOrder: 1 } });
  await prisma.auctionLot.create({ data: { auctionId: auction2.id, productId: p5.id, lotNumber: 2, sortOrder: 2 } });

  // Auction 3 (COMPLETED) - Antiques & Jewelry: p9, p12, p11
  const lot3_1 = await prisma.auctionLot.create({ data: { auctionId: auction3.id, productId: p9.id, lotNumber: 1, sortOrder: 1, status: 'sold', hammerPrice: 320000, winnerId: buyer1.id } });
  const lot3_2 = await prisma.auctionLot.create({ data: { auctionId: auction3.id, productId: p12.id, lotNumber: 2, sortOrder: 2, status: 'sold', hammerPrice: 520000, winnerId: buyer2.id } });
  const lot3_3 = await prisma.auctionLot.create({ data: { auctionId: auction3.id, productId: p11.id, lotNumber: 3, sortOrder: 3, status: 'sold', hammerPrice: 110000, winnerId: buyer1.id } });

  // Auction 4 (LIVE) - Watches: p14, p15
  const lot4_1 = await prisma.auctionLot.create({ data: { auctionId: auction4.id, productId: p14.id, lotNumber: 1, sortOrder: 1, status: 'active' } });
  const lot4_2 = await prisma.auctionLot.create({ data: { auctionId: auction4.id, productId: p15.id, lotNumber: 2, sortOrder: 2, status: 'pending' } });

  // Auction 5 (PRE_BID) - Contemporary: p4, p8
  await prisma.auctionLot.create({ data: { auctionId: auction5.id, productId: p4.id, lotNumber: 1, sortOrder: 1 } });
  await prisma.auctionLot.create({ data: { auctionId: auction5.id, productId: p8.id, lotNumber: 2, sortOrder: 2 } });

  // Auction 6 (PUBLISHED / DUTCH) - Furniture: p16, p17
  await prisma.auctionLot.create({ data: { auctionId: auction6.id, productId: p16.id, lotNumber: 1, sortOrder: 1 } });
  await prisma.auctionLot.create({ data: { auctionId: auction6.id, productId: p17.id, lotNumber: 2, sortOrder: 2 } });

  // Auction 7 (LIVE / SEALED) - Rare: p18, p20
  await prisma.auctionLot.create({ data: { auctionId: auction7.id, productId: p18.id, lotNumber: 1, sortOrder: 1, status: 'active' } });
  await prisma.auctionLot.create({ data: { auctionId: auction7.id, productId: p20.id, lotNumber: 2, sortOrder: 2, status: 'active' } });

  // Auction 8 (DRAFT) - Digital Art: p21
  await prisma.auctionLot.create({ data: { auctionId: auction8.id, productId: p21.id, lotNumber: 1, sortOrder: 1 } });

  // Auction 9 (PUBLISHED / HYBRID) - Carpets: p19, p13
  await prisma.auctionLot.create({ data: { auctionId: auction9.id, productId: p19.id, lotNumber: 1, sortOrder: 1 } });
  await prisma.auctionLot.create({ data: { auctionId: auction9.id, productId: p13.id, lotNumber: 2, sortOrder: 2 } });

  // Auction 10 (COMPLETED) - Sculptures & Ceramics: p6, p7
  const lot10_1 = await prisma.auctionLot.create({ data: { auctionId: auction10.id, productId: p6.id, lotNumber: 1, sortOrder: 1, status: 'sold', hammerPrice: 220000, winnerId: buyer3.id } });
  const lot10_2 = await prisma.auctionLot.create({ data: { auctionId: auction10.id, productId: p7.id, lotNumber: 2, sortOrder: 2, status: 'sold', hammerPrice: 430000, winnerId: buyer1.id } });

  // ============================================================
  // 9. BIDS (50+)
  // ============================================================
  console.log('Seeding bids...');

  const buyers = [buyer1, buyer2, buyer3];

  // Helper to create a series of bids
  async function createBidSeries(
    auctionId: string,
    lotId: string | null,
    bidders: typeof buyers,
    startAmount: number,
    increment: number,
    count: number,
    baseDate: Date,
    minutesBetween: number,
    lastIsWinning: boolean,
  ) {
    const bids = [];
    for (let i = 0; i < count; i++) {
      const bidder = bidders[i % bidders.length];
      const amount = startAmount + increment * i;
      const bidDate = new Date(baseDate.getTime() + i * minutesBetween * 60000);
      const isLast = i === count - 1;
      const bid = await prisma.bid.create({
        data: {
          auctionId,
          lotId,
          userId: bidder.id,
          amount,
          type: i % 4 === 0 ? BidType.PROXY : BidType.MANUAL,
          maxProxyAmount: i % 4 === 0 ? amount + increment * 3 : null,
          isWinning: lastIsWinning && isLast,
          ipAddress: `192.168.1.${10 + (i % 20)}`,
          createdAt: bidDate,
        },
      });
      bids.push(bid);
    }
    return bids;
  }

  // Auction 1 (LIVE) - 18 bids
  const bidsAuction1 = await createBidSeries(
    auction1.id, lot1_1.id, buyers,
    100000, 50000, 8,
    new Date('2026-02-25T14:05:00Z'), 15, false,
  );
  await createBidSeries(
    auction1.id, lot1_2.id, [buyer1, buyer2],
    200000, 50000, 6,
    new Date('2026-02-25T15:00:00Z'), 20, false,
  );
  await createBidSeries(
    auction1.id, lot1_3.id, [buyer2, buyer3],
    80000, 20000, 4,
    new Date('2026-02-25T16:00:00Z'), 25, false,
  );

  // Auction 3 (COMPLETED) - 32 bids across 3 lots
  const bidsAuction3_lot1 = await createBidSeries(
    auction3.id, lot3_1.id, [buyer1, buyer2, buyer3],
    80000, 30000, 9,
    new Date('2026-02-01T14:10:00Z'), 10, true,
  );
  const bidsAuction3_lot2 = await createBidSeries(
    auction3.id, lot3_2.id, [buyer2, buyer1, buyer3],
    100000, 40000, 12,
    new Date('2026-02-02T14:00:00Z'), 8, true,
  );
  const bidsAuction3_lot3 = await createBidSeries(
    auction3.id, lot3_3.id, [buyer1, buyer3],
    80000, 10000, 4,
    new Date('2026-02-03T14:00:00Z'), 12, true,
  );

  // Auction 4 (LIVE) - 12 bids
  await createBidSeries(
    auction4.id, lot4_1.id, [buyer1, buyer3],
    50000, 30000, 8,
    new Date('2026-02-24T10:10:00Z'), 30, false,
  );
  await createBidSeries(
    auction4.id, lot4_2.id, [buyer2, buyer1],
    50000, 20000, 4,
    new Date('2026-02-24T12:00:00Z'), 45, false,
  );

  // Auction 7 (SEALED_BID / LIVE) - 6 sealed bids
  for (let i = 0; i < 3; i++) {
    await prisma.bid.create({
      data: {
        auctionId: auction7.id,
        userId: buyers[i].id,
        amount: 600000 + (i + 1) * 100000,
        type: BidType.MANUAL,
        ipAddress: `192.168.1.${30 + i}`,
        createdAt: new Date(`2026-02-2${1 + i}T10:00:00Z`),
      },
    });
    await prisma.bid.create({
      data: {
        auctionId: auction7.id,
        userId: buyers[i].id,
        amount: 500000 + (i + 1) * 80000,
        type: BidType.MANUAL,
        ipAddress: `192.168.1.${30 + i}`,
        createdAt: new Date(`2026-02-2${1 + i}T14:00:00Z`),
      },
    });
  }

  // Auction 10 (COMPLETED) - 22 bids across 2 lots
  const bidsAuction10_lot1 = await createBidSeries(
    auction10.id, lot10_1.id, [buyer3, buyer1, buyer2],
    30000, 20000, 10,
    new Date('2026-02-10T14:10:00Z'), 12, true,
  );
  const bidsAuction10_lot2 = await createBidSeries(
    auction10.id, lot10_2.id, [buyer1, buyer2, buyer3],
    50000, 35000, 12,
    new Date('2026-02-11T14:00:00Z'), 10, true,
  );

  // ============================================================
  // 10. ORDERS (5)
  // ============================================================
  console.log('Seeding orders...');

  // Helper to compute order financials
  function computeOrder(hammerPrice: number) {
    const buyerCommission = hammerPrice * 0.05;
    const sellerCommission = hammerPrice * 0.10;
    const subtotal = hammerPrice + buyerCommission;
    const vatAmount = subtotal * 0.20;
    const totalAmount = subtotal + vatAmount;
    return { buyerCommission, sellerCommission, vatAmount, totalAmount };
  }

  // Get winning bids for completed auctions
  const winningBid3_1 = bidsAuction3_lot1[bidsAuction3_lot1.length - 1]; // buyer1 wins lot3_1
  const winningBid3_2 = bidsAuction3_lot2[bidsAuction3_lot2.length - 1]; // buyer2 wins lot3_2
  const winningBid3_3 = bidsAuction3_lot3[bidsAuction3_lot3.length - 1]; // buyer1 wins lot3_3
  const winningBid10_1 = bidsAuction10_lot1[bidsAuction10_lot1.length - 1]; // buyer3 wins lot10_1
  const winningBid10_2 = bidsAuction10_lot2[bidsAuction10_lot2.length - 1]; // buyer1 wins lot10_2

  const fin1 = computeOrder(320000);
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'MZ-2026-00001',
      auctionId: auction3.id,
      bidId: winningBid3_1.id,
      buyerId: buyer1.id,
      sellerId: seller2.id,
      hammerPrice: 320000,
      buyerCommission: fin1.buyerCommission,
      sellerCommission: fin1.sellerCommission,
      vatAmount: fin1.vatAmount,
      totalAmount: fin1.totalAmount,
      status: OrderStatus.COMPLETED,
      currency: 'TRY',
    },
  });

  const fin2 = computeOrder(520000);
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'MZ-2026-00002',
      auctionId: auction3.id,
      bidId: winningBid3_2.id,
      buyerId: buyer2.id,
      sellerId: auctionHouse.id,
      hammerPrice: 520000,
      buyerCommission: fin2.buyerCommission,
      sellerCommission: fin2.sellerCommission,
      vatAmount: fin2.vatAmount,
      totalAmount: fin2.totalAmount,
      status: OrderStatus.DELIVERED,
      currency: 'TRY',
    },
  });

  const fin3 = computeOrder(110000);
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'MZ-2026-00003',
      auctionId: auction3.id,
      bidId: winningBid3_3.id,
      buyerId: buyer1.id,
      sellerId: seller2.id,
      hammerPrice: 110000,
      buyerCommission: fin3.buyerCommission,
      sellerCommission: fin3.sellerCommission,
      vatAmount: fin3.vatAmount,
      totalAmount: fin3.totalAmount,
      status: OrderStatus.SHIPPED,
      currency: 'TRY',
    },
  });

  const fin4 = computeOrder(220000);
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'MZ-2026-00004',
      auctionId: auction10.id,
      bidId: winningBid10_1.id,
      buyerId: buyer3.id,
      sellerId: seller2.id,
      hammerPrice: 220000,
      buyerCommission: fin4.buyerCommission,
      sellerCommission: fin4.sellerCommission,
      vatAmount: fin4.vatAmount,
      totalAmount: fin4.totalAmount,
      status: OrderStatus.PAID,
      currency: 'TRY',
    },
  });

  const fin5 = computeOrder(430000);
  const order5 = await prisma.order.create({
    data: {
      orderNumber: 'MZ-2026-00005',
      auctionId: auction10.id,
      bidId: winningBid10_2.id,
      buyerId: buyer1.id,
      sellerId: auctionHouse.id,
      hammerPrice: 430000,
      buyerCommission: fin5.buyerCommission,
      sellerCommission: fin5.sellerCommission,
      vatAmount: fin5.vatAmount,
      totalAmount: fin5.totalAmount,
      status: OrderStatus.PENDING_PAYMENT,
      currency: 'TRY',
    },
  });

  // ============================================================
  // 11. NOTIFICATIONS (20+)
  // ============================================================
  console.log('Seeding notifications...');

  const notificationsData = [
    { userId: buyer1.id, type: 'auction_won', channel: NotificationChannel.IN_APP, title: 'Müzayede Kazandınız!', body: 'Kış Antika ve Mücevher Müzayedesinde Osmanlı Sedef Kakma Kuran Kutusu eserini kazandınız.', isRead: true, sentAt: new Date('2026-02-05T20:15:00Z') },
    { userId: buyer1.id, type: 'auction_won', channel: NotificationChannel.EMAIL, title: 'Müzayede Kazandınız!', body: 'Kış Antika ve Mücevher Müzayedesinde Art Deco Masa Saati eserini kazandınız.', isRead: true, sentAt: new Date('2026-02-05T20:16:00Z') },
    { userId: buyer2.id, type: 'auction_won', channel: NotificationChannel.IN_APP, title: 'Müzayede Kazandınız!', body: 'Osmanlı Elmas Broş eserini 520.000 TL ile kazandınız. Tebrikler!', isRead: true, sentAt: new Date('2026-02-05T20:17:00Z') },
    { userId: buyer2.id, type: 'auction_won', channel: NotificationChannel.EMAIL, title: 'Müzayede Kazandınız!', body: 'Osmanlı Elmas Broş eserini kazandınız. Ödeme detayları için sipariş sayfanızı ziyaret edin.', isRead: false, sentAt: new Date('2026-02-05T20:18:00Z') },
    { userId: buyer1.id, type: 'payment_received', channel: NotificationChannel.IN_APP, title: 'Ödeme Alındı', body: 'MZ-2026-00001 sipariş numaralı ödemeniz başarıyla alınmıştır.', isRead: true, sentAt: new Date('2026-02-06T10:00:00Z') },
    { userId: buyer3.id, type: 'auction_won', channel: NotificationChannel.IN_APP, title: 'Müzayede Kazandınız!', body: 'Bronz Semazen Heykeli eserini 220.000 TL ile kazandınız.', isRead: false, sentAt: new Date('2026-02-14T20:10:00Z') },
    { userId: buyer1.id, type: 'auction_won', channel: NotificationChannel.IN_APP, title: 'Müzayede Kazandınız!', body: 'Mermer Afrodit Büstü eserini 430.000 TL ile kazandınız.', isRead: false, sentAt: new Date('2026-02-14T20:12:00Z') },
    { userId: buyer1.id, type: 'bid_outbid', channel: NotificationChannel.IN_APP, title: 'Teklifiniz Aşıldı!', body: 'Bahar Klasik Sanat Müzayedesinde teklifiniz aşıldı. Yeni teklif verin!', isRead: false, sentAt: new Date('2026-02-25T15:30:00Z') },
    { userId: buyer2.id, type: 'bid_outbid', channel: NotificationChannel.IN_APP, title: 'Teklifiniz Aşıldı!', body: 'Kaplumbağa Terbiyecisi için teklifiniz aşıldı.', isRead: false, sentAt: new Date('2026-02-25T16:00:00Z') },
    { userId: buyer3.id, type: 'bid_outbid', channel: NotificationChannel.IN_APP, title: 'Teklifiniz Aşıldı!', body: 'Online Saat Koleksiyonunda teklifiniz aşıldı.', isRead: true, sentAt: new Date('2026-02-24T14:00:00Z') },
    { userId: buyer1.id, type: 'auction_started', channel: NotificationChannel.IN_APP, title: 'Müzayede Başladı!', body: 'Takip ettiğiniz Bahar Klasik Sanat Müzayedesi başladı.', isRead: true, sentAt: new Date('2026-02-25T14:00:00Z') },
    { userId: buyer2.id, type: 'auction_started', channel: NotificationChannel.IN_APP, title: 'Müzayede Başladı!', body: 'Online Saat Koleksiyonu müzayedesi başladı.', isRead: true, sentAt: new Date('2026-02-24T10:00:00Z') },
    { userId: buyer3.id, type: 'auction_started', channel: NotificationChannel.EMAIL, title: 'Müzayede Başladı!', body: 'Kapalı Zarf Nadir Eserler müzayedesi başladı. Teklifinizi verin!', isRead: false, sentAt: new Date('2026-02-20T10:00:00Z') },
    { userId: buyer1.id, type: 'order_shipped', channel: NotificationChannel.IN_APP, title: 'Siparişiniz Kargoya Verildi', body: 'MZ-2026-00003 sipariş numaralı ürününüz kargoya verilmiştir.', isRead: false, sentAt: new Date('2026-02-10T09:00:00Z') },
    { userId: buyer2.id, type: 'order_delivered', channel: NotificationChannel.IN_APP, title: 'Siparişiniz Teslim Edildi', body: 'MZ-2026-00002 sipariş numaralı ürününüz teslim edilmiştir.', isRead: true, sentAt: new Date('2026-02-15T14:00:00Z') },
    { userId: seller1.id, type: 'product_approved', channel: NotificationChannel.IN_APP, title: 'Ürününüz Onaylandı', body: 'Girl with Balloon - Signed Print ürününüz müzayedeye kabul edildi.', isRead: true, sentAt: new Date('2026-02-18T10:00:00Z') },
    { userId: seller2.id, type: 'payment_received', channel: NotificationChannel.IN_APP, title: 'Ödeme Alındı', body: 'Osmanlı Sedef Kakma Kuran Kutusu satışı için ödeme hesabınıza aktarıldı.', isRead: false, sentAt: new Date('2026-02-08T10:00:00Z') },
    { userId: auctionHouse.id, type: 'auction_completed', channel: NotificationChannel.IN_APP, title: 'Müzayede Tamamlandı', body: 'Kış Antika ve Mücevher Müzayedesi başarıyla tamamlandı. 3 lot satıldı.', isRead: true, sentAt: new Date('2026-02-05T20:20:00Z') },
    { userId: buyer1.id, type: 'auction_reminder', channel: NotificationChannel.EMAIL, title: 'Müzayede Hatırlatma', body: 'Çağdaş Sanat Online Müzayedesi 5 Mart\'ta başlıyor. Takviminize ekleyin!', isRead: false, sentAt: new Date('2026-03-01T09:00:00Z') },
    { userId: buyer2.id, type: 'auction_reminder', channel: NotificationChannel.EMAIL, title: 'Müzayede Hatırlatma', body: 'Modern Türk Sanatı Seçkisi 10 Mart\'ta başlıyor.', isRead: false, sentAt: new Date('2026-03-05T09:00:00Z') },
    { userId: buyer3.id, type: 'payment_reminder', channel: NotificationChannel.IN_APP, title: 'Ödeme Hatırlatma', body: 'MZ-2026-00004 siparişiniz için ödeme bekleniyor.', isRead: false, sentAt: new Date('2026-02-16T09:00:00Z') },
    { userId: buyer1.id, type: 'bid_confirmed', channel: NotificationChannel.IN_APP, title: 'Teklif Onaylandı', body: 'Bahar Klasik Sanat Müzayedesine 450.000 TL teklifiniz kaydedildi.', isRead: true, sentAt: new Date('2026-02-25T14:35:00Z') },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }

  // ============================================================
  // 12. PAGES (3) - CMS
  // ============================================================
  console.log('Seeding pages...');

  await prisma.page.upsert({
    where: { slug: 'hakkimizda' },
    update: {},
    create: {
      slug: 'hakkimizda',
      title: 'Hakkımızda',
      contentHtml: `<h1>Müzayede Platformu Hakkında</h1>
<p>Müzayede Platformu, Türkiye'nin lider dijital açık artırma platformudur. Sanat, antika, mücevher ve koleksiyon eserlerinin güvenli bir şekilde alınıp satılmasını sağlıyoruz.</p>
<h2>Misyonumuz</h2>
<p>Sanat ve antika dünyasını dijitalleştirerek herkese erişilebilir kılmak. Şeffaf, güvenli ve kullanıcı dostu bir müzayede deneyimi sunmak.</p>
<h2>Vizyonumuz</h2>
<p>Türkiye ve bölgenin en güvenilir online müzayede platformu olmak.</p>`,
      metaTitle: 'Hakkımızda | Müzayede Platformu',
      metaDescription: 'Türkiyenin lider dijital açık artırma platformu hakkında bilgi edinin.',
      isPublished: true,
      sortOrder: 1,
    },
  });

  await prisma.page.upsert({
    where: { slug: 'kullanim-kosullari' },
    update: {},
    create: {
      slug: 'kullanim-kosullari',
      title: 'Kullanım Koşulları',
      contentHtml: `<h1>Kullanım Koşulları</h1>
<p>Son güncelleme: 1 Ocak 2026</p>
<h2>1. Genel Hükümler</h2>
<p>Bu platformu kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız. Platform üzerinden yapılan tüm işlemler Türkiye Cumhuriyeti yasalarına tabidir.</p>
<h2>2. Üyelik</h2>
<p>Platforma üye olmak için 18 yaşını doldurmuş olmanız gerekmektedir. Üyelik bilgilerinizin doğruluğundan siz sorumlusunuz.</p>
<h2>3. Müzayede Kuralları</h2>
<p>Verilen teklifler bağlayıcıdır. Kazanılan müzayedelerde ödeme yükümlülüğü alıcıya aittir. Alıcı komisyon oranı %5, satıcı komisyon oranı %10'dur.</p>
<h2>4. Ödeme ve İade</h2>
<p>Ödeme 7 iş günü içinde yapılmalıdır. Sahte veya tanıma uymayan eserler için iade hakkı saklıdır.</p>`,
      metaTitle: 'Kullanım Koşulları | Müzayede Platformu',
      metaDescription: 'Müzayede Platformu kullanım koşulları ve kuralları.',
      isPublished: true,
      sortOrder: 2,
    },
  });

  await prisma.page.upsert({
    where: { slug: 'gizlilik-politikasi' },
    update: {},
    create: {
      slug: 'gizlilik-politikasi',
      title: 'Gizlilik Politikası',
      contentHtml: `<h1>Gizlilik Politikası</h1>
<p>Son güncelleme: 1 Ocak 2026</p>
<h2>1. Toplanan Veriler</h2>
<p>Ad, soyad, e-posta adresi, telefon numarası, adres bilgileri ve ödeme bilgileri toplanmaktadır.</p>
<h2>2. Verilerin Kullanımı</h2>
<p>Kişisel verileriniz yalnızca platform hizmetlerinin sunulması, sipariş süreçlerinin yönetilmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla kullanılır.</p>
<h2>3. Veri Güvenliği</h2>
<p>Tüm veriler SSL şifreleme ile korunmaktadır. KVKK kapsamında haklarınız saklıdır.</p>`,
      metaTitle: 'Gizlilik Politikası | Müzayede Platformu',
      metaDescription: 'Müzayede Platformu gizlilik politikası ve kişisel verilerin korunması.',
      isPublished: true,
      sortOrder: 3,
    },
  });

  // ============================================================
  // 13. BANNERS (3)
  // ============================================================
  console.log('Seeding banners...');

  await prisma.banner.create({
    data: {
      title: 'Bahar Klasik Sanat Müzayedesi - Şimdi Canlı!',
      imageUrl: '/images/banners/bahar-klasik-sanat-banner.jpg',
      mobileImageUrl: '/images/banners/bahar-klasik-sanat-banner-mobile.jpg',
      linkUrl: '/muzayede/bahar-klasik-sanat-muzayedesi',
      position: 'homepage',
      sortOrder: 1,
      isActive: true,
      startDate: new Date('2026-02-20'),
      endDate: new Date('2026-03-01'),
    },
  });

  await prisma.banner.create({
    data: {
      title: 'Çağdaş Sanat Online Müzayedesi - Yakında',
      imageUrl: '/images/banners/cagdas-sanat-online-banner.jpg',
      mobileImageUrl: '/images/banners/cagdas-sanat-online-banner-mobile.jpg',
      linkUrl: '/muzayede/cagdas-sanat-online-muzayedesi',
      position: 'homepage',
      sortOrder: 2,
      isActive: true,
      startDate: new Date('2026-02-25'),
      endDate: new Date('2026-03-12'),
    },
  });

  await prisma.banner.create({
    data: {
      title: 'Satıcı Olun - Eserlerinizi Dünyaya Açın',
      imageUrl: '/images/banners/satici-olun-banner.jpg',
      mobileImageUrl: '/images/banners/satici-olun-banner-mobile.jpg',
      linkUrl: '/satici-basvuru',
      position: 'homepage',
      sortOrder: 3,
      isActive: true,
    },
  });

  // ============================================================
  // 14. BLOG POSTS (2)
  // ============================================================
  console.log('Seeding blog posts...');

  await prisma.blogPost.upsert({
    where: { slug: 'turk-resim-sanati-tarihi' },
    update: {},
    create: {
      title: 'Türk Resim Sanatının Kısa Tarihi',
      slug: 'turk-resim-sanati-tarihi',
      excerpt: 'Osmanlıdan günümüze Türk resim sanatının evrimi ve önemli sanatçılar.',
      contentHtml: `<h1>Türk Resim Sanatının Kısa Tarihi</h1>
<p>Türk resim sanatı, Osmanlı İmparatorluğunun son döneminde Batılı tarzda eğitim almış sanatçılarla başlamıştır.</p>
<h2>Öncüler</h2>
<p>Osman Hamdi Bey, Şeker Ahmed Paşa ve Süleyman Seyyid gibi isimler Türk resminin temellerini atmıştır. Osman Hamdi Bey, hem ressam hem de arkeolog olarak Osmanlı kültür hayatına büyük katkılarda bulunmuştur.</p>
<h2>Cumhuriyet Dönemi</h2>
<p>Cumhuriyetin ilanıyla birlikte Avrupaya gönderilen sanatçılar modern akımları Türkiyeye taşımıştır. d Grubu ve Yeniler Grubu gibi oluşumlar bu dönemin önemli hareketleridir.</p>
<h2>Günümüz</h2>
<p>Bugün Türk çağdaş sanatı uluslararası arenada giderek daha fazla tanınmaktadır. İstanbul Bienali gibi etkinlikler bu tanınırlığa katkı sağlamaktadır.</p>`,
      coverImageUrl: '/images/blog/turk-resim-sanati-tarihi.jpg',
      authorId: admin1.id,
      metaTitle: 'Türk Resim Sanatının Kısa Tarihi | Müzayede Blog',
      metaDescription: 'Osmanlıdan günümüze Türk resim sanatının evrimi.',
      isPublished: true,
      publishedAt: new Date('2026-02-01T10:00:00Z'),
    },
  });

  await prisma.blogPost.upsert({
    where: { slug: 'muzayede-rehberi-yeni-baslayanlar' },
    update: {},
    create: {
      title: 'Müzayede Rehberi: Yeni Başlayanlar İçin',
      slug: 'muzayede-rehberi-yeni-baslayanlar',
      excerpt: 'Online müzayedelere ilk kez katılacaklar için kapsamlı rehber.',
      contentHtml: `<h1>Müzayede Rehberi: Yeni Başlayanlar İçin</h1>
<p>Online müzayedelere katılmak hem heyecan verici hem de kârlı bir deneyim olabilir. İşte bilmeniz gerekenler.</p>
<h2>1. Araştırma Yapın</h2>
<p>İlgilendiğiniz eserleri ve piyasa değerlerini önceden araştırın. Tahmini fiyat aralıkları size rehberlik edecektir.</p>
<h2>2. Bütçe Belirleyin</h2>
<p>Müzayedeye girmeden önce maksimum bütçenizi belirleyin. Komisyon ve KDV ekleneceğini unutmayın.</p>
<h2>3. Proxy Teklif Kullanın</h2>
<p>Müzayedeyi takip edemeyeceğiniz zamanlar için otomatik teklif (proxy bid) özelliğini kullanabilirsiniz.</p>
<h2>4. Sabırlı Olun</h2>
<p>İlk müzayedenizde kazanamayabilirsiniz. Deneyim kazandıkça stratejinizi geliştireceksiniz.</p>`,
      coverImageUrl: '/images/blog/muzayede-rehberi.jpg',
      authorId: admin2.id,
      metaTitle: 'Müzayede Rehberi: Yeni Başlayanlar İçin | Müzayede Blog',
      metaDescription: 'Online müzayedelere yeni başlayanlar için kapsamlı rehber.',
      isPublished: true,
      publishedAt: new Date('2026-02-15T10:00:00Z'),
    },
  });

  // ============================================================
  // 15. FAQs (8 total: 3 existing + 5 new)
  // ============================================================
  console.log('Seeding FAQs...');

  const faqs = [
    {
      question: 'Nasıl kayıt olabilirim?',
      answer: 'E-posta adresiniz veya telefon numaranız ile kayıt olabilirsiniz. Google ve Apple hesabınız ile de hızlı kayıt yapabilirsiniz.',
      category: 'genel',
    },
    {
      question: 'Teklif nasıl verilir?',
      answer: 'Müzayede sayfasındaki teklif alanına tutarı girerek veya hızlı artırım butonlarını kullanarak teklif verebilirsiniz. Proxy (otomatik) teklif ile maksimum tutarınızı belirleyerek sisteme teklif verdirtebilirsiniz.',
      category: 'teklif',
    },
    {
      question: 'Ödeme nasıl yapılır?',
      answer: 'Kredi kartı, banka havalesi veya taksitli ödeme seçenekleri ile ödeme yapabilirsiniz. Ödeme 7 iş günü içinde tamamlanmalıdır.',
      category: 'odeme',
    },
    {
      question: 'Komisyon oranları nedir?',
      answer: 'Alıcı komisyonu %5, satıcı komisyonu %10\'dur. KDV oranı %20 olarak uygulanır. Toplam ödemeniz = (Çekiç fiyatı + Alıcı komisyonu) + KDV şeklinde hesaplanır.',
      category: 'odeme',
    },
    {
      question: 'Eserimi nasıl satışa çıkarabilirim?',
      answer: 'Satıcı hesabı oluşturarak başvuru yapabilirsiniz. Başvurunuz onaylandıktan sonra ürünlerinizi ekleyebilir ve müzayedeye çıkarabilirsiniz. KYC doğrulaması gereklidir.',
      category: 'satici',
    },
    {
      question: 'Kargo ve teslimat nasıl yapılır?',
      answer: 'Eserler UPS kargo veya özel beyaz eldiven teslimat servisi ile gönderilir. Değerli eserler için sigortalı teslimat zorunludur. Teslimat süresi 3-7 iş günüdür.',
      category: 'kargo',
    },
    {
      question: 'İade politikası nedir?',
      answer: 'Teslim alınan eserin tanımına uymadığı veya sahte olduğu tespit edilirse 14 gün içinde iade talep edilebilir. Uzman değerlendirmesi sonrasında iade işlemi yapılır.',
      category: 'iade',
    },
    {
      question: 'Proxy (otomatik) teklif nedir?',
      answer: 'Proxy teklif, belirlediğiniz maksimum tutara kadar sistemi sizin adınıza otomatik teklif vermeye yetkilendirmenizdir. Sistem, diğer teklifler geldiğinde minimum artırım miktarında otomatik teklif verir.',
      category: 'teklif',
    },
  ];

  for (let i = 0; i < faqs.length; i++) {
    await prisma.faq.create({
      data: { ...faqs[i], sortOrder: i, isActive: true },
    });
  }

  // ============================================================
  // DONE
  // ============================================================
  console.log('Seed completed successfully!');
  console.log(`  - ${Object.keys(categories).length} categories`);
  console.log('  - 8 users (2 admins, 3 buyers, 2 sellers, 1 auction house)');
  console.log('  - 5 artists');
  console.log(`  - ${Object.keys(tags).length} tags`);
  console.log(`  - ${allProducts.length} products`);
  console.log(`  - ${allAuctions.length} auctions`);
  console.log('  - 50+ bids');
  console.log('  - 5 orders');
  console.log(`  - ${notificationsData.length} notifications`);
  console.log('  - 3 pages');
  console.log('  - 3 banners');
  console.log('  - 2 blog posts');
  console.log(`  - ${faqs.length} FAQs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
