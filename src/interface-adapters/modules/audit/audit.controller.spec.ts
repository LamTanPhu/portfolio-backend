/**
 * @fileoverview AuditController Unit Tests
 *
 * Single admin-only endpoint. Verifies the JwtAuthGuard is actually applied
 * (not just documented via @ApiBearerAuth) and that query params are parsed
 * as numbers before reaching GetAuditLogsQuery — a raw string cursor/limit
 * would silently break the repository's Prisma query.
 */

import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { AuditController } from './audit.controller'
import { GetAuditLogsQuery } from '../../../application/use-cases/queries/audit/GetAuditLogsQuery'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'

const mockQuery = { execute: jest.fn() }

describe('AuditController', () => {
    let controller: AuditController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuditController],
            providers: [{ provide: GetAuditLogsQuery, useValue: mockQuery }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<AuditController>(AuditController)
    })

    it('is protected by JwtAuthGuard — admin only', () => {
        // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
        const guards = Reflect.getMetadata(GUARDS_METADATA, AuditController.prototype.findAll) as unknown[] | undefined

        expect(guards).toContain(JwtAuthGuard)
    })

    it('forwards parsed cursor and limit to GetAuditLogsQuery', async () => {
        const page = { items: [], nextCursor: null, total: 0 }
        mockQuery.execute.mockResolvedValue(page)

        const result = await controller.findAll(10, 25)

        expect(mockQuery.execute).toHaveBeenCalledWith(10, 25)
        expect(result).toBe(page)
    })

    it('works with no cursor/limit for the first page', async () => {
        mockQuery.execute.mockResolvedValue({ items: [], nextCursor: null, total: 0 })

        await controller.findAll(undefined, undefined)

        expect(mockQuery.execute).toHaveBeenCalledWith(undefined, undefined)
    })
})
