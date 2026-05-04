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
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'
import { GetAllBlogsQuery } from '../../../application/use-cases/queries/blog/GetAllBlogsQuery'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { UpdateBlogCommand } from '../../../application/use-cases/commands/blog/UpdateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import type { BlogDTO } from '../../../application/dtos/BlogDTO'
import { BlogPresenter } from './blog.presenter'
import { CreateBlogDto, UpdateBlogDto } from './blog.dto'

// =============================================================================
// BlogController
// Public GET — published blogs, no auth required.
// Admin GET all — includes drafts, JWT required.
// Admin POST/PATCH/DELETE — JWT required.
// userId extracted from verified JWT payload — never from client input.
// =============================================================================
@ApiTags('Blog')
@Controller('blogs')
export class BlogController {
    constructor(
        private readonly getPublishedQuery: GetPublishedBlogsQuery,
        private readonly getAllQuery:        GetAllBlogsQuery,
        private readonly getBySlugQuery:    GetBlogBySlugQuery,
        private readonly createCommand:     CreateBlogCommand,
        private readonly updateCommand:     UpdateBlogCommand,
        private readonly deleteCommand:     DeleteBlogCommand,
    ) {}

    // ===========================================================================
    // GET /api/blogs — public
    // ===========================================================================
    @Get()
    @ApiOperation({ summary: 'Get all published blog posts' })
    @ApiResponse({ status: 200, description: 'List of published blog posts' })
    async findAll(): Promise<BlogDTO[]> {
        const dtos = await this.getPublishedQuery.execute()
        return BlogPresenter.toListResponse(dtos)
    }

    // ===========================================================================
    // GET /api/blogs/admin — admin only, includes drafts
    // ===========================================================================
    @Get('admin')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get all blog posts including drafts — admin only' })
    @ApiResponse({ status: 200, description: 'List of all blog posts' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findAllAdmin(): Promise<BlogDTO[]> {
        const dtos = await this.getAllQuery.execute()
        return BlogPresenter.toListResponse(dtos)
    }

    // ===========================================================================
    // GET /api/blogs/:slug — public
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
    // POST /api/blogs — admin only
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
        userId:      req.user.sub,
        })
        return BlogPresenter.toResponse(result)
    }

    // ===========================================================================
    // PATCH /api/blogs/:id — admin only
    // ===========================================================================
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update a blog post — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 200, description: 'Blog post updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Blog post not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBlogDto,
    ): Promise<BlogDTO> {
        const result = await this.updateCommand.execute({
        id,
        title:       dto.title,
        content:     dto.content,
        excerpt:     dto.excerpt,
        tags:        dto.tags,
        isPublished: dto.isPublished,
        })
        return BlogPresenter.toResponse(result)
    }

    // ===========================================================================
    // DELETE /api/blogs/:id — admin only
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