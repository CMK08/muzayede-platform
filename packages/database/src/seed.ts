import { PrismaClient, UserRole, AuctionType, AuctionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Default categories
  const categories = [
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

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, depth: 0, sortOrder: categories.indexOf(cat) },
    });
  }

  // Default Super Admin
  await prisma.user.upsert({
    where: { email: 'admin@muzayede.com' },
    update: {},
    create: {
      email: 'admin@muzayede.com',
      passwordHash: '$2b$12$placeholder_hash_change_on_first_login',
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      language: 'tr',
      profile: {
        create: {
          firstName: 'Sistem',
          lastName: 'Admin',
          displayName: 'Admin',
        },
      },
    },
  });

  // Default FAQ entries
  const faqs = [
    {
      question: 'Nasıl kayıt olabilirim?',
      answer: 'E-posta adresiniz veya telefon numaranız ile kayıt olabilirsiniz.',
      category: 'genel',
    },
    {
      question: 'Teklif nasıl verilir?',
      answer:
        'Müzayede sayfasındaki teklif alanına tutarı girerek veya hızlı artırım butonlarını kullanarak teklif verebilirsiniz.',
      category: 'teklif',
    },
    {
      question: 'Ödeme nasıl yapılır?',
      answer:
        'Kredi kartı, banka havalesi veya taksitli ödeme seçenekleri ile ödeme yapabilirsiniz.',
      category: 'odeme',
    },
  ];

  for (let i = 0; i < faqs.length; i++) {
    await prisma.faq.create({
      data: { ...faqs[i], sortOrder: i, isActive: true },
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
