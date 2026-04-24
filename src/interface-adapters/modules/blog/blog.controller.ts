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
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'
import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'
import type { BlogDTO } from '../../../application/dtos/BlogDTO'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { CreateBlogDto } from './blog.dto'
import { BlogPresenter } from './blog.presenter'

// =============================================================================
// BlogController
// Public routes — read published blogs, no auth required.
// Admin routes — create, delete require valid JWT with fingerprint check.
// userId extracted from verified JWT payload — never trusted from client input.
// =============================================================================
@ApiTags('Blog')
@Controller('blogs')
export class BlogController {
    constructor(
        private readonly getPublishedQuery: GetPublishedBlogsQuery,
        private readonly getBySlugQuery:    GetBlogBySlugQuery,
        private readonly createCommand:     CreateBlogCommand,
        private readonly deleteCommand:     DeleteBlogCommand,
    ) {}

    // ===========================================================================
    // GET /api/blogs
    // Returns published blog summaries — content excluded, no auth required.
    // ===========================================================================
    @Get()
    @ApiOperation({ summary: 'Get all published blog posts' })
    @ApiResponse({ status: 200, description: 'List of published blog posts' })
    async findAll(): Promise<BlogDTO[]> {
        const dtos = await this.getPublishedQuery.execute()
        return BlogPresenter.toListResponse(dtos)
    }

    // ===========================================================================
    // GET /api/blogs/:slug
    // Returns full blog post including content — public, no auth required.
    // Slug is unique indexed — O(1) lookup.
    // ===========================================================================
    @Get(':slug')
    @ApiOperation({ summary: 'Get blog post by slug' })
    @ApiParam({ name: 'slug', example: 'building-clean-architecture-nestjs' })
    @ApiResponse({ status: 200, description: 'Blog post found' })
    @ApiResponse({ status: 404, description: 'Blog post not found' })
    async findBySlug(@Param('slug') slug: string): Promise<BlogDTO> {
        const dto = await this.getBySlugQuery.execute(slug)
        return BlogPresenter.toResponse(dto)
    }

    // ===========================================================================
    // POST /api/blogs
    // Creates a new blog post — admin only, JWT required.
    // userId extracted from JWT payload — sub claim set at login.
    // Never trust userId from request body — always from verified token.
    // ===========================================================================
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create a new blog post — admin only' })
    @ApiResponse({ status: 201, description: 'Blog post created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @Body() dto: CreateBlogDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<BlogDTO> {
        const result = await this.createCommand.execute({
        title:       dto.title,
        content:     dto.content,
        excerpt:     dto.excerpt     ?? null,
        tags:        dto.tags        ?? [],
        isPublished: dto.isPublished ?? false,
        // userId extracted from verified JWT payload — never from client input
        userId:      req.user.sub,
        })
        return BlogPresenter.toResponse(result)
    }

    // ===========================================================================
    // DELETE /api/blogs/:id
    // Deletes a blog post — admin only, JWT required.
    // BlogTags cascade deleted automatically via onDelete: Cascade in schema.
    // ===========================================================================
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a blog post — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Blog post deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Blog post not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}