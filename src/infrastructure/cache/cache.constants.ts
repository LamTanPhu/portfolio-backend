// =============================================================================
// Cache TTL Profiles
//
// fresh:
// Duration (in seconds) the cache is considered fully fresh.
// Requests within this window receive data without any background activity.
//
// stale:
// Additional duration (in seconds) allowed for stale-while-revalidate strategy.
// During this window, stale data may still be served while a background refresh
// occurs to update the cache for future requests.
//
// This design enables excellent performance + freshness balance.
// =============================================================================
export const CACHE_TTL = {
    REALTIME: {
        fresh: 10,
        stale: 30,
    },

    SHORT: {
        fresh: 60,
        stale: 300,
    },

    MEDIUM: {
        fresh: 300,
        stale: 1800,
    },

    LONG: {
        fresh: 3600,
        stale: 21600,
    },

    VERY_LONG: {
        fresh: 21600,
        stale: 86400,
    },

    STATIC: {
        fresh: 86400, // 24 hours
        stale: 259200, // 3 days
    },
} as const

export type CacheProfile = keyof typeof CACHE_TTL
