/**
 * @fileoverview BlogModule
 * 
 * Organizes all Blog-related concerns following Clean Architecture.
 * - Controllers
 * - Application Use Cases (Commands & Queries)
 * - Infrastructure Implementations
 */

import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'

import { BlogController } from './blog.controller'

// Use Cases
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { UpdateBlogCommand } from '../../../application/use-cases/commands/blog/UpdateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'
import { GetAllBlogsQuery } from '../../../application/use-cases/queries/blog/GetAllBlogsQuery'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'

// Repositories
import { PrismaBlogReadRepository } from '../../../infrastructure/database/repositories/blog/PrismaBlogReadRepository'
import { PrismaBlogWriteRepository } from '../../../infrastructure/database/repositories/blog/PrismaBlogWriteRepository'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

// Cache

@Module({
    imports: [
        AuthModule,
        CacheInfrastructureModule,   // ← Important: brings cache services
    ],

    controllers: [BlogController],

    providers: [
        PrismaBlogReadRepository,
        PrismaBlogWriteRepository,

        // Read / Write Ports
        {
            provide: 'IBlogReadRepository',
            useExisting: PrismaBlogReadRepository,
        },
        {
            provide: 'IBlogWriteRepository',
            useExisting: PrismaBlogWriteRepository,
        },

        // Use Cases
        GetPublishedBlogsQuery,
        GetAllBlogsQuery,
        GetBlogBySlugQuery,
        CreateBlogCommand,
        UpdateBlogCommand,
        DeleteBlogCommand,
    ],
})
export class BlogModule {}