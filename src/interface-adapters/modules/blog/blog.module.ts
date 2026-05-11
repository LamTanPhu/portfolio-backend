import { Module } from '@nestjs/common'

// =============================================================================
// Commands
// =============================================================================
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import { UpdateBlogCommand } from '../../../application/use-cases/commands/blog/UpdateBlogCommand'

// =============================================================================
// Queries
// =============================================================================
import { GetAllBlogsQuery } from '../../../application/use-cases/queries/blog/GetAllBlogsQuery'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'
import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'

// =============================================================================
// Domain Repository Ports
// =============================================================================
import { IBlogReadRepository } from '../../../domain/repositories/blog/IBlogReadRepository'
import { IBlogWriteRepository } from '../../../domain/repositories/blog/IBlogWriteRepository'

// =============================================================================
// Infrastructure
// =============================================================================
import { PrismaBlogRepository } from '../../../infrastructure/database/repositories/PrismaBlogRepository'

// =============================================================================
// Interface Adapters
// =============================================================================
import { AuthModule } from '../auth/auth.module'
import { BlogController } from './blog.controller'

// =============================================================================
// BlogModule
// AuthModule imported — JwtAuthGuard on admin endpoints needs AuthService.
// PrismaBlogRepository implements both read and write interfaces.
// Cache infrastructure is globally provided via AppModule.
// =============================================================================
@Module({
    imports: [AuthModule],

    controllers: [BlogController],

    providers: [
        // ─── Repository Implementation ───────────────────────────────────────
        PrismaBlogRepository,

        // ─── Repository Ports ────────────────────────────────────────────────
        {
            provide: 'IBlogReadRepository',
            useExisting: PrismaBlogRepository,
        },
        {
            provide: 'IBlogWriteRepository',
            useExisting: PrismaBlogRepository,
        },

        // ─── Queries ─────────────────────────────────────────────────────────
        GetPublishedBlogsQuery,
        GetAllBlogsQuery,
        GetBlogBySlugQuery,

        // ─── Commands ────────────────────────────────────────────────────────
        CreateBlogCommand,
        UpdateBlogCommand,
        DeleteBlogCommand,
    ],
})
export class BlogModule {}