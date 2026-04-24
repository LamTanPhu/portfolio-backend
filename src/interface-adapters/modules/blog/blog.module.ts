import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BlogController } from './blog.controller'
import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import { PrismaBlogRepository } from '../../../infrastructure/database/repositories/PrismaBlogRepository'

// =============================================================================
// BlogModule
// AuthModule imported — JwtAuthGuard on admin endpoints needs AuthService.
// PrismaBlogRepository implements both read and write interfaces.
// DeleteBlogCommand receives same repo instance for both read and write.
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [BlogController],
    providers: [
        // ─── Repositories ───────────────────────────────────────────────────────
        PrismaBlogRepository,
        { provide: 'IBlogReadRepository',  useExisting: PrismaBlogRepository },
        { provide: 'IBlogWriteRepository', useExisting: PrismaBlogRepository },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
        provide:    GetPublishedBlogsQuery,
        useFactory: (repo: PrismaBlogRepository) =>
            new GetPublishedBlogsQuery(repo),
        inject: [PrismaBlogRepository],
        },
        {
        provide:    GetBlogBySlugQuery,
        useFactory: (repo: PrismaBlogRepository) =>
            new GetBlogBySlugQuery(repo),
        inject: [PrismaBlogRepository],
        },
        {
        provide:    CreateBlogCommand,
        useFactory: (repo: PrismaBlogRepository) =>
            new CreateBlogCommand(repo),
        inject: [PrismaBlogRepository],
        },
        {
        provide:    DeleteBlogCommand,
        // Same repo instance serves both read and write interfaces
        useFactory: (repo: PrismaBlogRepository) =>
            new DeleteBlogCommand(repo, repo),
        inject: [PrismaBlogRepository],
        },
    ],
})
export class BlogModule {}