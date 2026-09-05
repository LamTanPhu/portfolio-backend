/**
 * @fileoverview test/global-setup.js
 *
 * Runs once before the entire e2e suite (see test/jest-e2e.json's
 * "globalSetup"). Two jobs:
 *   1. Apply migrations to the test database.
 *   2. Seed the single admin user the whole suite logs in as.
 *
 * Deliberately plain CommonJS, not TypeScript — this runs outside Jest's
 * ts-jest transform pipeline, so keeping it dependency-free (no generated
 * Prisma Client needed here) avoids any chicken-and-egg ordering with step 1.
 * bcrypt cost factor (12) and the upsert-by-email shape mirror
 * prisma/seed.example.ts exactly — this is that same seed, just pointed at
 * the test database and run automatically instead of by hand.
 *
 * In CI (.github/workflows/ci.yml, the `e2e` job) DATABASE_URL / ADMIN_EMAIL
 * / ADMIN_PASSWORD are already real environment variables before this ever
 * runs. dotenv here only fills gaps for local `npm run test:e2e` — by
 * default it never overrides an already-set variable, so CI's values always
 * win.
 */

const { execSync } = require('child_process')
const path = require('path')
const bcrypt = require('bcrypt')
const { Client } = require('pg')

require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') })

module.exports = async function globalSetup() {
    if (!process.env.DATABASE_URL) {
        throw new Error('[global-setup] DATABASE_URL is not set — check .env.test or your CI env vars')
    }

    console.log('[global-setup] Applying migrations to the test database...')
    execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: process.env,
        cwd: path.resolve(__dirname, '..'),
    })

    console.log('[global-setup] Seeding e2e admin user...')
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
        throw new Error('[global-setup] ADMIN_EMAIL / ADMIN_PASSWORD are not set — check .env.test')
    }

    const hashPassword = await bcrypt.hash(adminPassword, 12)

    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()

    try {
        await client.query(
            `INSERT INTO users (firstname, lastname, email, hash_password, updated_at)
             VALUES ($1, $2, $3, $4, now())
             ON CONFLICT (email) DO UPDATE
               SET hash_password = EXCLUDED.hash_password, updated_at = now()`,
            ['E2E', 'Admin', adminEmail, hashPassword],
        )
    } finally {
        await client.end()
    }

    console.log('[global-setup] Done.')
}
