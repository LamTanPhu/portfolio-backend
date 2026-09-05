/**
 * @fileoverview PrismaAdminCredentialRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these.
 *
 * This is, by the file's own header comment, "the ONLY place in the entire
 * codebase that selects hashPassword from the DB." That makes the exact
 * select shape the single highest-value assertion in this whole test suite:
 * if a future refactor ever widens CREDENTIAL_SELECT or merges this class
 * with PrismaUserReadRepository, this test is what catches it.
 */

import { PrismaAdminCredentialRepository } from './PrismaAdminCredentialRepository'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    user: {
        findUnique: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

describe('PrismaAdminCredentialRepository', () => {
    let repo: PrismaAdminCredentialRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaAdminCredentialRepository(mockPrisma as unknown as PrismaService)
    })

    it('selects ONLY id and hashPassword — never any other user column', async () => {
        mockClient.user.findUnique.mockResolvedValue({ id: 1, hashPassword: 'hashed-value' })

        await repo.findCredentialByEmail('admin@example.com')

        expect(mockClient.user.findUnique).toHaveBeenCalledWith({
            where: { email: 'admin@example.com' },
            select: { id: true, hashPassword: true },
        })
    })

    it('returns exactly { id, hashPassword } for a matching email', async () => {
        mockClient.user.findUnique.mockResolvedValue({ id: 1, hashPassword: 'hashed-value' })

        const result = await repo.findCredentialByEmail('admin@example.com')

        expect(result).toEqual({ id: 1, hashPassword: 'hashed-value' })
    })

    it('returns null for a non-existent email — never throws, so login timing stays uniform', async () => {
        mockClient.user.findUnique.mockResolvedValue(null)

        const result = await repo.findCredentialByEmail('nobody@example.com')

        expect(result).toBeNull()
    })
})
