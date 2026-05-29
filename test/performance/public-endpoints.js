/**
 * @fileoverview Public Endpoints Performance Test
 *
 * Tests the most visitor-facing endpoints under realistic load.
 * These all hit Redis cache after the first request — should be very fast.
 *
 * Thresholds (what we consider acceptable):
 * - 95% of requests complete under 200ms
 * - 99% of requests complete under 500ms
 * - Error rate under 1%
 *
 * Run: k6 run test/performance/public-endpoints.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// =============================================================================
// Custom Metrics
// =============================================================================

const errorRate = new Rate('error_rate')
const blogTrend = new Trend('blog_list_duration')
const projectsTrend = new Trend('projects_list_duration')
const skillsTrend = new Trend('skills_list_duration')
const aboutTrend = new Trend('about_endpoints_duration')

// =============================================================================
// Test Configuration
// =============================================================================

export const options = {
    insecureSkipTLSVerify: true,
    stages: [
        { duration: '10s', target: 10  }, // Ramp up to 10 virtual users
        { duration: '30s', target: 50  }, // Ramp up to 50 virtual users
        { duration: '30s', target: 50  }, // Hold at 50 VUs
        { duration: '10s', target: 0   }, // Ramp down
    ],
    thresholds: {
        // 95% of all requests must complete under 200ms
        http_req_duration: ['p(95)<200', 'p(99)<500'],
        // Error rate must stay under 1%
        error_rate: ['rate<0.01'],
        // Individual endpoint thresholds
        blog_list_duration:      ['p(95)<150'],
        projects_list_duration:  ['p(95)<150'],
        skills_list_duration:    ['p(95)<150'],
        about_endpoints_duration: ['p(95)<150'],
    },
}

// =============================================================================
// Base URL — your local server
// =============================================================================

const BASE_URL = 'https://localhost:3001/api'

// k6 params — disable SSL verification for self-signed localhost cert
const params = {
    insecureSkipTLSVerify: true,
}

// =============================================================================
// Main Test Function — runs once per VU per iteration
// =============================================================================

export default function () {
    // ── Blog List ──────────────────────────────────────────────────────────────
    const blogsRes = http.get(`${BASE_URL}/blogs`, params)
    blogTrend.add(blogsRes.timings.duration)
    errorRate.add(blogsRes.status !== 200)

    check(blogsRes, {
        'GET /blogs → 200':           (r) => r.status === 200,
        'GET /blogs → returns array': (r) => Array.isArray(JSON.parse(r.body)),
    })

    sleep(0.1)

    // ── Projects List ──────────────────────────────────────────────────────────
    const projectsRes = http.get(`${BASE_URL}/projects`, params)
    projectsTrend.add(projectsRes.timings.duration)
    errorRate.add(projectsRes.status !== 200)

    check(projectsRes, {
        'GET /projects → 200':           (r) => r.status === 200,
        'GET /projects → returns array': (r) => Array.isArray(JSON.parse(r.body)),
    })

    sleep(0.1)

    // ── Skills ─────────────────────────────────────────────────────────────────
    const skillsRes = http.get(`${BASE_URL}/skills`, params)
    skillsTrend.add(skillsRes.timings.duration)
    errorRate.add(skillsRes.status !== 200)

    check(skillsRes, {
        'GET /skills → 200': (r) => r.status === 200,
    })

    sleep(0.1)

    // ── About Endpoints ────────────────────────────────────────────────────────
    const aboutEndpoints = [
        '/about/skills',
        '/about/education',
        '/about/jobs',
        '/about/certifications',
        '/about/social',
    ]

    for (const endpoint of aboutEndpoints) {
        const res = http.get(`${BASE_URL}${endpoint}`, params)
        aboutTrend.add(res.timings.duration)
        errorRate.add(res.status !== 200)

        check(res, {
        [`GET ${endpoint} → 200`]: (r) => r.status === 200,
        })

        sleep(0.05)
    }
}