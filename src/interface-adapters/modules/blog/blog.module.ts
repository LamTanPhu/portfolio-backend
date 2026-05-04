import { Module } from '@nestjs/common'
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import { UpdateBlogCommand } from '../../../application/use-cases/commands/blog/UpdateBlogCommand'
import { GetAllBlogsQuery } from '../../../application/use-cases/queries/blog/GetAllBlogsQuery'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'
import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'
import { PrismaBlogRepository } from '../../../infrastructure/database/repositories/PrismaBlogRepository'
import { AuthModule } from '../auth/auth.module'
import { BlogController } from './blog.controller'

// =============================================================================
// BlogModule
// AuthModule imported — JwtAuthGuard on admin endpoints needs AuthService.
// PrismaBlogRepository implements both read and write interfaces.
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
        provide:    GetAllBlogsQuery,
        useFactory: (repo: PrismaBlogRepository) =>
            new GetAllBlogsQuery(repo),
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
        provide:    UpdateBlogCommand,
        useFactory: (repo: PrismaBlogRepository) =>
            new UpdateBlogCommand(repo),
        inject: [PrismaBlogRepository],
        },
        {
        provide:    DeleteBlogCommand,
        useFactory: (repo: PrismaBlogRepository) =>
            new DeleteBlogCommand(repo, repo),
        inject: [PrismaBlogRepository],
        },
    ],
})
export class BlogModule {}