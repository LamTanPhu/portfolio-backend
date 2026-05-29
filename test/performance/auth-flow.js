/**
 * @fileoverview Auth Flow Performance Test — Comprehensive
 *
 * Tests the full authentication lifecycle with meaningful sample sizes.
 *
 * Scenarios:
 * 1. Cold vs warm login comparison
 * 2. Token verification on protected routes
 * 3. Full lifecycle: login → protected route → refresh → logout
 * 4. Sustained login attempts for statistically meaningful p95/p99
 *
 * Credentials passed via -e flags — never hardcoded.
 *
 * Run:
 * k6 run -e ADMIN_PASSWORD=yourpassword test/performance/auth-flow.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// =============================================================================
// Custom Metrics
// =============================================================================

const errorRate           = new Rate('error_rate')
const loginColdTrend      = new Trend('login_cold_ms')
const loginWarmTrend      = new Trend('login_warm_ms')
const tokenVerifyTrend    = new Trend('token_verify_ms')
const refreshTrend        = new Trend('token_refresh_ms')
const logoutTrend         = new Trend('logout_ms')
const fullCycleTrend      = new Trend('full_cycle_ms')

// =============================================================================
// Config
// =============================================================================

const PASSWORD = __ENV.ADMIN_PASSWORD || ''
const BASE_URL = 'https://localhost:3001/api'

const jsonHeaders = {
    headers: { 'Content-Type': 'application/json' },
}

// =============================================================================
// Test Options
// =============================================================================

export const options = {
    insecureSkipTLSVerify: true,

    scenarios: {
        // Scenario 1: Sustained logins — enough samples for meaningful stats
        sustained_login: {
        executor:    'constant-arrival-rate',
        rate:        4,              // 4 iterations/min — safely under 5/min limit
        timeUnit:    '1m',
        duration:    '3m',          // 3 minutes = ~12 samples
        preAllocatedVUs: 1,
        maxVUs:      2,
        exec:        'sustained_login',
        tags:        { scenario: 'sustained_login' },
        },

        // Scenario 2: Full lifecycle — login → protected → refresh → logout
        full_lifecycle: {
        executor:    'per-vu-iterations',
        vus:         1,
        iterations:  3,             // 3 full cycles
        startTime:   '10s',        // Start after sustained login warms up
        maxDuration: '3m',
        exec:        'full_lifecycle',
        tags:        { scenario: 'full_lifecycle' },
        },
    },

    thresholds: {
        error_rate:       ['rate<0.01'],
        login_cold_ms:    ['p(95)<500'],
        login_warm_ms:    ['p(95)<200', 'p(99)<500'],
        token_verify_ms:  ['p(95)<70'],   // Protected route should be very fast
        token_refresh_ms: ['p(95)<200'],
        logout_ms:        ['p(95)<200'],
        full_cycle_ms:    ['p(95)<2000'], // Full cycle under 1 second
    },
}

// =============================================================================
// Helpers
// =============================================================================

function login() {
    return http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ password: PASSWORD }),
        jsonHeaders,
    )
}

function extractToken(res) {
    try {
        return JSON.parse(res.body).accessToken || null
    } catch {
        return null
    }
}

function extractCookies(res) {
    return res.headers['Set-Cookie'] || ''
}

// =============================================================================
// Scenario 1: Sustained Login
// Runs continuously to build up statistically meaningful sample sizes.
// First iteration tagged as "cold", rest as "warm".
// =============================================================================

let loginCount = 0

export function sustained_login() {
    const isCold = loginCount === 0
    loginCount++

    const res = login()
    const duration = res.timings.duration

    errorRate.add(res.status !== 200)

    if (isCold) {
        loginColdTrend.add(duration)
        console.log(`Cold login: ${duration.toFixed(2)}ms`)
    } else {
        loginWarmTrend.add(duration)
    }

    check(res, {
        'login → 200':             (r) => r.status === 200,
        'login → has accessToken': (r) => !!extractToken(r),
    })

    // 15s sleep — 4 per minute safely under the 5/min rate limit
    sleep(15)
}

// =============================================================================
// Scenario 2: Full Lifecycle
// login → hit protected route → refresh token → logout
// =============================================================================

export function full_lifecycle() {
    const cycleStart = Date.now()

    group('1. Login', () => {
    const res = login()
    errorRate.add(res.status !== 200)

    const ok = check(res, {
        'lifecycle login → 200':             (r) => r.status === 200,
        'lifecycle login → has accessToken': (r) => !!extractToken(r),
    })

    if (!ok) return

    const accessToken  = extractToken(res)
    const cookieHeader = extractCookies(res)

    sleep(0.5)

    // ── Hit a protected route with the token ────────────────────────────────
    group('2. Protected Route', () => {
        const protectedRes = http.get(`${BASE_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type':  'application/json',
            },
        })

        tokenVerifyTrend.add(protectedRes.timings.duration)
        errorRate.add(protectedRes.status !== 200)

        check(protectedRes, {
            'protected route → 200': (r) => r.status === 200,
        })
    })

    sleep(0.5)

    // ── Refresh the access token ────────────────────────────────────────────
    group('3. Token Refresh', () => {
        const refreshRes = http.post(`${BASE_URL}/auth/refresh`, null, {
            headers: {
                'Cookie':         cookieHeader,
                'Content-Type':   'application/json',
            },
        })

        refreshTrend.add(refreshRes.timings.duration)
        errorRate.add(refreshRes.status !== 200)

        const newToken = extractToken(refreshRes)

        check(refreshRes, {
            'refresh → 200':             (r) => r.status === 200,
            'refresh → has accessToken': (r) => !!newToken,
        })

        sleep(0.5)

        // ── Logout ──────────────────────────────────────────────────────────
        group('4. Logout', () => {
            const logoutRes = http.post(`${BASE_URL}/auth/logout`, null, {
                headers: {
                    'Authorization': `Bearer ${newToken || accessToken}`,
                    'Content-Type':  'application/json',
                },
            })

            logoutTrend.add(logoutRes.timings.duration)
            errorRate.add(logoutRes.status !== 204)

            check(logoutRes, {
            'logout → 204': (r) => r.status === 204,
            })
        })
        })
    })

    fullCycleTrend.add(Date.now() - cycleStart)

    // Wait between full cycles to respect rate limits
    sleep(20)
}