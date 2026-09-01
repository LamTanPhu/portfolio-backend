/**
 * @fileoverview BlogController
 *
 * REST API controller for blog operations.
 * Public endpoints require no authentication.
 * Admin endpoints require valid JWT.
 */

import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { Throttle } from '@nestjs/throttler'

import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'
import { GetAllBlogsQuery } from '../../../application/use-cases/queries/blog/GetAllBlogsQuery'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { UpdateBlogCommand } from '../../../application/use-cases/commands/blog/UpdateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import { SearchBlogsQuery } from '../../../application/use-cases/queries/blog/SearchBlogsQuery'

import { BlogPresenter } from './blog.presenter'
import { CreateBlogDto, UpdateBlogDto, SearchBlogsDto } from './blog.dto'

@ApiTags('Blog')
@Controller('blogs')
export class BlogController {
    constructor(
        private readonly getPublishedQuery: GetPublishedBlogsQuery,
        private readonly getAllQuery: GetAllBlogsQuery,
        private readonly getBySlugQuery: GetBlogBySlugQuery,
        private readonly searchQuery: SearchBlogsQuery,
        private readonly createCommand: CreateBlogCommand,
        private readonly updateCommand: UpdateBlogCommand,
        private readonly deleteCommand: DeleteBlogCommand,
    ) {}

    // ===========================================================================
    // GET /api/blogs — public
    // ===========================================================================
    @Get()
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiOperation({ summary: 'Get all published blog posts' })
    async findAll() {
        const dtos = await this.getPublishedQuery.execute()
        return BlogPresenter.toSummaryListResponse(dtos)
    }

    // ===========================================================================
    // GET /api/blogs/admin — admin only, includes drafts
    // ===========================================================================
    @Get('admin')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get all blog posts including drafts (Admin only)' })
    async findAllAdmin() {
        const dtos = await this.getAllQuery.execute()
        return BlogPresenter.toSummaryListResponse(dtos)
    }

    // ===========================================================================
    // GET /api/blogs/search?q=... — public
    // Must come before GET /:slug — Nest/Express match routes in
    // declaration order, so a search here would otherwise be swallowed by
    // :slug (treated as findBySlug('search')) if declared after it.
    // ===========================================================================
    @Get('search')
    @Throttle({ default: { limit: 60, ttl: 60_000 } })
    @ApiOperation({ summary: 'Full-text search across published blog posts' })
    async search(@Query() dto: SearchBlogsDto) {
        const dtos = await this.searchQuery.execute(dto.q)
        return BlogPresenter.toSummaryListResponse(dtos)
    }

    // ===========================================================================
    // GET /api/blogs/:slug — public
    // ===========================================================================
    @Get(':slug')
    @Throttle({ default: { limit: 100, ttl: 60_000 } })
    @ApiOperation({ summary: 'Get blog post by slug' })
    @ApiParam({ name: 'slug', example: 'building-clean-architecture-nestjs' })
    async findBySlug(@Param('slug') slug: string) {
        const dto = await this.getBySlugQuery.execute(slug)
        return BlogPresenter.toDetailResponse(dto)
    }

    // ===========================================================================
    // POST /api/blogs — admin only
    // ===========================================================================
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create a new blog post (Admin only)' })
    async create(@Body() dto: CreateBlogDto, @Req() req: AuthenticatedRequest) {
        const result = await this.createCommand.execute({
            title: dto.title,
            content: dto.content,
            excerpt: dto.excerpt ?? null,
            tags: dto.tags ?? [],
            isPublished: dto.isPublished ?? false,
            userId: req.user.sub,
        })
        return BlogPresenter.toDetailResponse(result)
    }

    // ===========================================================================
    // PATCH /api/blogs/:id — admin only
    // ===========================================================================
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update a blog post (Admin only)' })
    async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBlogDto) {
        const result = await this.updateCommand.execute({ id, ...dto })
        return BlogPresenter.toDetailResponse(result)
    }

    // ===========================================================================
    // DELETE /api/blogs/:id — admin only
    // ===========================================================================
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a blog post (Admin only)' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}
