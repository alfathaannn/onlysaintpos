const { PrismaClient } = require('@prisma/client');

// Membuat single instance PrismaClient agar tidak ada error 'Too many connections'
const prisma = new PrismaClient({});

module.exports = prisma;
