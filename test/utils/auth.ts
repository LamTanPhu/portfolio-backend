/**
 * @fileoverview loginAsAdmin
 *
 * Logs in with the seeded e2e admin (see test/global-setup.js) and returns
 * the access token every admin-only test needs. AuthService issues a fresh
 * JTI per login, so calling this more than once per spec file is safe.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { api } from './http'

export interface AdminSession {
    accessToken: string
}

export async function loginAsAdmin(app: INestApplication<Server>): Promise<AdminSession> {
    const password = process.env.ADMIN_PASSWORD
    if (!password) {
        throw new Error('ADMIN_PASSWORD is not set — check .env.test')
    }

    const res = await api(app).post('/api/auth/login').send({ password }).expect(200)

    const body = res.body as { accessToken: string }
    return { accessToken: body.accessToken }
}
