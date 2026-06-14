const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({});

async function main() {
  console.log('🌱 Memulai seeder database...');

  // 1. Buat User (Kasir)
  const kasir = await prisma.user.upsert({
    where: { email: 'kasir1@onlysaint.pos' },
    update: {},
    create: {
      name: 'Kasir Satu',
      email: 'kasir1@onlysaint.pos',
      password: 'password123', // Nanti harus di-hash (bcrypt) di real app
      role: 'KASIR',
    },
  });
  console.log('✅ Kasir berhasil dibuat:', kasir.name, '(ID:', kasir.id, ')');

  // 2. Buat Kategori
  const catCoffee = await prisma.category.upsert({
    where: { name: 'Kopi' },
    update: {},
    create: { name: 'Kopi' },
  });

  const catSnack = await prisma.category.upsert({
    where: { name: 'Snack' },
    update: {},
    create: { name: 'Snack' },
  });
  console.log('✅ Kategori berhasil dibuat');

  // 3. Buat Produk
  const produk1 = await prisma.product.create({
    data: {
      name: 'Kopi Susu Aren',
      description: 'Kopi susu dengan gula aren asli',
      price: 20000.00, // Format Decimal
      stock: 50,
      categoryId: catCoffee.id,
    },
  });

  const produk2 = await prisma.product.create({
    data: {
      name: 'Americano',
      description: 'Espresso dengan air panas',
      price: 15000.00,
      stock: 100,
      categoryId: catCoffee.id,
    },
  });

  const produk3 = await prisma.product.create({
    data: {
      name: 'Kentang Goreng',
      description: 'Kentang goreng renyah',
      price: 18000.00,
      stock: 30,
      categoryId: catSnack.id,
    },
  });
  console.log('✅ Produk berhasil dibuat');

  console.log('🎉 Seeding database selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Gagal melakukan seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
