/**
 * @fileoverview ContactController Unit Tests
 *
 * TurnstileGuard and JwtAuthGuard are overridden to always allow — this
 * suite is about the controller's own request-shaping logic and delegation,
 * not the guards' internal logic (they have their own spec files). What's
 * verified here that unit-testing the commands/queries alone can't show:
 * that TurnstileGuard is actually wired to the public POST, that JwtAuthGuard
 * protects both admin routes, and that req.ip/user-agent are extracted
 * correctly before reaching SubmitContactCommand.
 */

import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import type { Request } from 'express'
import { ContactController } from './contact.controller'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { GetContactMessagesQuery } from '../../../application/use-cases/queries/contact/GetContactMessagesQuery'
import { DeleteContactMessageCommand } from '../../../application/use-cases/commands/contact/DeleteContactMessageCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { TurnstileGuard } from '../../guards/TurnstileGuard'

const mockSubmitContact = { execute: jest.fn() }
const mockGetMessages = { execute: jest.fn() }
const mockDeleteMessage = { execute: jest.fn() }

const makeDto = (overrides = {}) => ({
    name: 'Jane Visitor',
    email: 'jane@visitor.com',
    message: 'Hello, I would like to discuss a potential collaboration.',
    turnstileToken: '0x4AAAAAAA...',
    ...overrides,
})

const makeRequest = (overrides: Partial<Request> = {}): Request =>
    ({ ip: '203.0.113.5', headers: { 'user-agent': 'Mozilla/5.0' }, ...overrides }) as Request

describe('ContactController', () => {
    let controller: ContactController

    beforeEach(async () => {
        jest.clearAllMocks()
        mockSubmitContact.execute.mockResolvedValue(undefined)
        mockDeleteMessage.execute.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ContactController],
            providers: [
                { provide: SubmitContactCommand, useValue: mockSubmitContact },
                { provide: GetContactMessagesQuery, useValue: mockGetMessages },
                { provide: DeleteContactMessageCommand, useValue: mockDeleteMessage },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .overrideGuard(TurnstileGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<ContactController>(ContactController)
    })

    describe('POST /contact — public', () => {
        it('is protected by TurnstileGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, ContactController.prototype.handleSubmit) as
                | unknown[]
                | undefined

            expect(guards).toContain(TurnstileGuard)
        })

        it('is NOT protected by JwtAuthGuard — this endpoint is public', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const handleSubmit = ContactController.prototype.handleSubmit
            const guards = (Reflect.getMetadata(GUARDS_METADATA, handleSubmit) as unknown[] | undefined) ?? []

            expect(guards).not.toContain(JwtAuthGuard)
        })

        it('forwards name/email/message plus request ip and user-agent', async () => {
            await controller.handleSubmit(makeDto(), makeRequest())

            expect(mockSubmitContact.execute).toHaveBeenCalledWith({
                name: 'Jane Visitor',
                email: 'jane@visitor.com',
                message: 'Hello, I would like to discuss a potential collaboration.',
                ipAddress: '203.0.113.5',
                browserInfo: 'Mozilla/5.0',
            })
        })

        it('falls back to "unknown" ip when req.ip is missing', async () => {
            await controller.handleSubmit(makeDto(), makeRequest({ ip: undefined }))

            expect(mockSubmitContact.execute).toHaveBeenCalledWith(expect.objectContaining({ ipAddress: 'unknown' }))
        })

        it('passes null browserInfo when there is no User-Agent header', async () => {
            await controller.handleSubmit(makeDto(), makeRequest({ headers: {} }))

            expect(mockSubmitContact.execute).toHaveBeenCalledWith(expect.objectContaining({ browserInfo: null }))
        })

        it('returns a success confirmation without leaking internal command output', async () => {
            const result = await controller.handleSubmit(makeDto(), makeRequest())

            expect(result).toEqual({ success: true, message: 'Thank you! Your message has been received.' })
        })
    })

    describe('GET /contact — admin only', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, ContactController.prototype.findAll) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('forwards cursor and limit to GetContactMessagesQuery', async () => {
            const page = { items: [], nextCursor: null, total: 0 }
            mockGetMessages.execute.mockResolvedValue(page)

            const result = await controller.findAll(5, 10)

            expect(mockGetMessages.execute).toHaveBeenCalledWith(5, 10)
            expect(result).toBe(page)
        })
    })

    describe('DELETE /contact/:id — admin only', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, ContactController.prototype.delete) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('forwards the parsed numeric id to DeleteContactMessageCommand', async () => {
            await controller.delete(7)

            expect(mockDeleteMessage.execute).toHaveBeenCalledWith(7)
        })

        it('returns nothing (204 No Content)', async () => {
            const result = await controller.delete(7)

            expect(result).toBeUndefined()
        })
    })
})
