import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common'
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'
import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { CreateBlogDto } from './blog.dto'
import { BlogPresenter } from './blog.presenter'

@Controller('blogs')
export class BlogController {
    constructor(
        private readonly getPublishedQuery: GetPublishedBlogsQuery,
        private readonly getBySlugQuery: GetBlogBySlugQuery,
        private readonly createCommand: CreateBlogCommand,
        private readonly deleteCommand: DeleteBlogCommand,
    ) {}

    // ─── Public ───────────────────────────────────────────────────────────────

    @Get()
    async findAll() {
        const dtos = await this.getPublishedQuery.execute()
        return BlogPresenter.toListResponse(dtos)
    }

    @Get(':slug')
    async findBySlug(@Param('slug') slug: string) {
        const dto = await this.getBySlugQuery.execute(slug)
        return BlogPresenter.toResponse(dto)
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() dto: CreateBlogDto) {
        const result = await this.createCommand.execute({
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt ?? null,
        tags: dto.tags ?? [],
        isPublished: dto.isPublished ?? false,
        userId: 1,
        })
        return BlogPresenter.toResponse(result)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}