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
// Imports AuthModule — JwtAuthGuard depends on AuthService from AuthModule.
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [BlogController],
    providers: [
        PrismaBlogRepository,
        { provide: 'IBlogReadRepository',  useExisting: PrismaBlogRepository },
        { provide: 'IBlogWriteRepository', useExisting: PrismaBlogRepository },
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
        useFactory: (repo: PrismaBlogRepository) =>
            new DeleteBlogCommand(repo, repo),
        inject: [PrismaBlogRepository],
        },
    ],
})
export class BlogModule {}