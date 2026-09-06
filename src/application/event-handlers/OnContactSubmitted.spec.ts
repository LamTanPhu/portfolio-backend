/**
 * @fileoverview OnContactSubmitted Unit Tests
 *
 * BUG FIX regression coverage: every field interpolated into the admin
 * notification email must be HTML-escaped — including ipAddress. It looks
 * server-derived (req.ip) and therefore "safe", but with TRUST_PROXY_HOPS
 * misconfigured relative to the real reverse-proxy chain (or a proxy that
 * doesn't strip incoming X-Forwarded-For), a client can control the value
 * Express reads as req.ip. Previously only name/email/browserInfo/message
 * were escaped; ipAddress went into the HTML unescaped.
 *
 * ConfigService and ILogger are mocked — this suite only asserts on the
 * HTML string handed to IMailService.send(), not on delivery itself.
 */

import { ConfigService } from '@nestjs/config'
import { OnContactSubmitted } from './OnContactSubmitted'
import { ContactSubmittedEvent } from '../../domain/events/ContactSubmittedEvent'
import type { IMailService } from '../ports/IMailService'
import type { ILogger } from '../ports/ILogger'

const mockMail: jest.Mocked<IMailService> = { send: jest.fn() }
const mockLogger: jest.Mocked<ILogger> = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
const mockConfig = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>

function makeEvent(): ContactSubmittedEvent {
    return new ContactSubmittedEvent('Alice', 'alice@example.com', 'Hello there', '203.0.113.5', 'Mozilla/5.0')
}

describe('OnContactSubmitted', () => {
    let handler: OnContactSubmitted

    beforeEach(() => {
        jest.clearAllMocks()
        mockConfig.get.mockReturnValue('admin@example.com')
        handler = new OnContactSubmitted(mockMail, mockLogger, mockConfig)
    })

    it('escapes an HTML-injection attempt in ipAddress before sending', async () => {
        const event = makeEvent()
        // Simulate a spoofed X-Forwarded-For value landing in req.ip.
        const malicious = new ContactSubmittedEvent(
            event.name,
            event.email,
            event.message,
            '<script>alert(1)</script>',
            event.browserInfo,
        )

        await handler.handle(malicious)

        const [, , body] = mockMail.send.mock.calls[0]
        expect(body).not.toContain('<script>alert(1)</script>')
        expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    })

    it('still escapes name, email, browserInfo, and message (existing behavior)', async () => {
        const event = new ContactSubmittedEvent(
            '<b>Alice</b>',
            'alice@example.com',
            '<img src=x onerror=alert(1)>',
            '203.0.113.5',
            '<script>evil()</script>',
        )

        await handler.handle(event)

        const [, , body] = mockMail.send.mock.calls[0]
        expect(body).not.toContain('<b>Alice</b>')
        expect(body).not.toContain('<img src=x onerror=alert(1)>')
        expect(body).not.toContain('<script>evil()</script>')
    })

    it('omits the IP Address line entirely when ipAddress is null, rather than escaping "null"', async () => {
        const event = new ContactSubmittedEvent('Alice', 'alice@example.com', 'Hi', null, null)

        await handler.handle(event)

        const [, , body] = mockMail.send.mock.calls[0]
        expect(body).not.toContain('IP Address')
    })

    it('sends to ADMIN_EMAIL with the visitor name in the subject', async () => {
        await handler.handle(makeEvent())

        // eslint-disable-next-line @typescript-eslint/unbound-method -- asserting on the jest.fn() mock reference is intentional
        expect(mockMail.send).toHaveBeenCalledWith(
            'admin@example.com',
            'New Contact Message from Alice',
            expect.any(String),
        )
    })

    it('logs and swallows a mail delivery failure rather than throwing', async () => {
        mockMail.send.mockRejectedValue(new Error('Resend is down'))

        await expect(handler.handle(makeEvent())).resolves.toBeUndefined()
        // eslint-disable-next-line @typescript-eslint/unbound-method -- asserting on the jest.fn() mock reference is intentional
        expect(mockLogger.error).toHaveBeenCalled()
    })
})
