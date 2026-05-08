// =============================================================================
// prisma/seed.example.ts
// Portfolio Database Seeder — Example File
// Copy this to prisma/seed.ts and customize before running.
// This file should be gitignored.
// =============================================================================

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcrypt'
import * as dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
})

const prisma = new PrismaClient({ adapter })

async function main(): Promise<void> {
    console.log(' Seeding database...')

    // Validate required environment variables
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail) {
        throw new Error(' ADMIN_EMAIL is not set in .env file')
    }

    if (!adminPassword) {
        throw new Error(' ADMIN_PASSWORD is not set in .env file')
    }

    if (adminPassword.length < 8) {
        console.warn('  Warning: ADMIN_PASSWORD is quite short. Consider using a stronger password in production.')
    }

    const hashPassword = await bcrypt.hash(adminPassword, 12)

    const user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {}, // If user exists, do nothing
        create: {
            firstname: 'YOUR_FIRSTNAME_HERE',     // ← Change this
            lastname: 'YOUR_LASTNAME_HERE',       // ← Change this
            email: adminEmail,
            hashPassword,
            aboutme: 'YOUR_SHORT_BIO_HERE',       // ← Change this
        },
    })

    console.log(` User seeded successfully!`)
    console.log(`   ID    : ${user.id}`)
    console.log(`   Email : ${user.email}`)
    console.log(' Seeding complete.')
}

main()
    .catch((error) => {
        console.error('❌ Seed failed:', error.message)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })