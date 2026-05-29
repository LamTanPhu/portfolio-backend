/**
 * @fileoverview Load Test — Breaking Point Discovery
 *
 * Ramps up virtual users aggressively to find where the server starts
 * degrading. Monitors error rates, response times, and throughput.
 *
 * Stages:
 * 1. Warm up — 50 VUs (already known to work)
 * 2. Medium load — 100 VUs
 * 3. High load — 200 VUs
 * 4. Stress — 500 VUs
 * 5. Peak stress — 1000 VUs
 * 6. Cool down — back to 0
 *
 * Run: k6 run test/performance/load-test.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// =============================================================================
// Custom Metrics
// =============================================================================

const errorRate        = new Rate('error_rate')
const successRate      = new Rate('success_rate')
const blogsLatency     = new Trend('blogs_latency')
const projectsLatency  = new Trend('projects_latency')
const totalRequests    = new Counter('total_requests')

// =============================================================================
// Test Configuration
// =============================================================================

export const options = {
    insecureSkipTLSVerify: true,

    stages: [
        { duration: '30s', target: 50   }, // Warm up — known baseline
        { duration: '60s', target: 50   }, // Hold baseline
        { duration: '30s', target: 100  }, // Ramp to 100 VUs
        { duration: '60s', target: 100  }, // Hold at 100
        { duration: '30s', target: 200  }, // Ramp to 200 VUs
        { duration: '60s', target: 200  }, // Hold at 200
        { duration: '30s', target: 500  }, // Ramp to 500 VUs
        { duration: '60s', target: 500  }, // Hold at 500
        { duration: '30s', target: 1000 }, // Ramp to 1000 VUs — stress territory
        { duration: '60s', target: 1000 }, // Hold at 1000
        { duration: '30s', target: 0    }, // Cool down
    ],

    thresholds: {
        // Error rate must stay under 5% — above this the server is struggling
        error_rate:          ['rate<0.05'],
        // 95% of requests under 500ms at any load level
        http_req_duration:   ['p(95)<500'],
        // Individual endpoint thresholds
        blogs_latency:       ['p(95)<500'],
        projects_latency:    ['p(95)<500'],
    },
}

// =============================================================================
// Base URL
// =============================================================================

const BASE_URL = 'https://127.0.0.1:3001/api'

const params = {
    tags: { type: 'public' },
}

// =============================================================================
// Main Test Function
// =============================================================================

export default function () {
    totalRequests.add(1)

    // ── Blogs ──────────────────────────────────────────────────────────────────
    const blogsRes = http.get(`${BASE_URL}/blogs`, params)
    blogsLatency.add(blogsRes.timings.duration)

    const blogsOk = check(blogsRes, {
        'GET /blogs → 200 or 429': (r) => r.status === 200 || r.status === 429,
    })
    errorRate.add(!blogsOk)
    successRate.add(blogsOk)

    sleep(0.1)

    // ── Projects ───────────────────────────────────────────────────────────────
    const projectsRes = http.get(`${BASE_URL}/projects`, params)
    projectsLatency.add(projectsRes.timings.duration)

    const projectsOk = check(projectsRes, {
        'GET /projects → 200 or 429': (r) => r.status === 200 || r.status === 429,
    })
    errorRate.add(!projectsOk)
    successRate.add(projectsOk)

    sleep(0.1)

    // ── Skills ─────────────────────────────────────────────────────────────────
    const skillsRes = http.get(`${BASE_URL}/skills`, params)

    const skillsOk = check(skillsRes, {
        'GET /skills → 200 or 429': (r) => r.status === 200 || r.status === 429,
    })
    errorRate.add(!skillsOk)
    successRate.add(skillsOk)

    sleep(0.1)

    // ── About endpoints ────────────────────────────────────────────────────────
    const aboutRes = http.get(`${BASE_URL}/about/skills`, params)

    const aboutOk = check(aboutRes, {
        'GET /about/skills → 200 or 429': (r) => r.status === 200 || r.status === 429,
    })
    errorRate.add(!aboutOk)
    successRate.add(aboutOk)

    sleep(0.1)
}

// =============================================================================
// Summary Report
// =============================================================================

export function handleSummary(data) {
    const successPercent = (data.metrics.success_rate?.values?.rate * 100).toFixed(2)
    const errorPercent   = (data.metrics.error_rate?.values?.rate * 100).toFixed(2)
    const p95            = data.metrics.http_req_duration?.values['p(95)']?.toFixed(2)
    const p99            = data.metrics.http_req_duration?.values['p(99)']?.toFixed(2)
    const rps            = data.metrics.http_reqs?.values?.rate?.toFixed(0)
    const totalReqs      = data.metrics.http_reqs?.values?.count

    console.log('\n========================================')
    console.log('         LOAD TEST SUMMARY')
    console.log('========================================')
    console.log(`Total requests:    ${totalReqs}`)
    console.log(`Requests/sec:      ${rps}`)
    console.log(`Success rate:      ${successPercent}%`)
    console.log(`Error rate:        ${errorPercent}%`)
    console.log(`p95 response time: ${p95}ms`)
    console.log(`p99 response time: ${p99}ms`)
    console.log('========================================\n')

    return {}
}