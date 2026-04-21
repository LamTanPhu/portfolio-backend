# Run this from inside your portfolio-backend directory
# cd portfolio-backend
# .\scaffold-backend.ps1

$dirs = @(
  "src/domain/entities",
  "src/domain/value-objects",
  "src/domain/services",
  "src/domain/repositories/project",
  "src/domain/repositories/blog",
  "src/domain/repositories/contact",
  "src/domain/repositories/analytics",
  "src/domain/errors",
  "src/domain/events",
  "src/application/use-cases/commands/project",
  "src/application/use-cases/commands/blog",
  "src/application/use-cases/commands/contact",
  "src/application/use-cases/queries/project",
  "src/application/use-cases/queries/blog",
  "src/application/use-cases/queries/skill",
  "src/application/use-cases/queries/analytics",
  "src/application/event-handlers",
  "src/application/ports",
  "src/application/dtos",
  "src/infrastructure/database/prisma",
  "src/infrastructure/database/repositories",
  "src/infrastructure/database/mappers",
  "src/infrastructure/database/unit-of-work",
  "src/infrastructure/cloudflare",
  "src/infrastructure/spotify",
  "src/infrastructure/mail",
  "src/infrastructure/logging",
  "src/interface-adapters/guards",
  "src/interface-adapters/filters",
  "src/interface-adapters/modules/auth",
  "src/interface-adapters/modules/project",
  "src/interface-adapters/modules/blog",
  "src/interface-adapters/modules/contact",
  "src/interface-adapters/modules/skill",
  "src/interface-adapters/modules/analytics",
  "src/interface-adapters/modules/spotify"
)

foreach ($dir in $dirs) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
Write-Host "Folders created." -ForegroundColor Green

# ─── Domain / Entities ───────────────────────────────────────────────────────

Set-Content "src/domain/entities/User.ts" @"
export class User {
  constructor(
    public readonly id: number,
    public readonly firstname: string,
    public readonly lastname: string,
    public readonly email: string,
    public readonly aboutme: string,
    public readonly lastLogin: Date,
  ) {}

  get fullName(): string { return `${this.firstname} ${this.lastname}` }
}
"@

Set-Content "src/domain/entities/Project.ts" @"
export class Project {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly description: string,
    public readonly slug: string,
    public readonly techStack: string[],
    public readonly isPublished: boolean,
    public readonly isOpenSource: boolean,
    public readonly userId: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
"@

Set-Content "src/domain/entities/Blog.ts" @"
export class Blog {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly slug: string,
    public readonly content: string,
    public readonly tags: string[],
    public readonly isPublished: boolean,
    public readonly userId: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
"@

Set-Content "src/domain/entities/Skill.ts" @"
export type SkillCategory = 'frontend' | 'backend' | 'devops' | 'database' | 'other'

export class Skill {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly imageUrl: string,
    public readonly category: SkillCategory,
    public readonly isPublic: boolean,
    public readonly userId: number,
    public readonly createdAt: Date,
  ) {}
}
"@

Set-Content "src/domain/entities/Education.ts" @"
export class Education {
  constructor(
    public readonly id: number,
    public readonly degreeName: string,
    public readonly instituteName: string,
    public readonly instituteUrl: string,
    public readonly startedAt: Date,
    public readonly endedAt: Date | null,
    public readonly isCompleted: boolean,
    public readonly userId: number,
  ) {}
}
"@

Set-Content "src/domain/entities/Job.ts" @"
export class Job {
  constructor(
    public readonly id: number,
    public readonly companyName: string,
    public readonly role: string,
    public readonly startedAt: Date,
    public readonly endedAt: Date | null,
    public readonly isEnded: boolean,
    public readonly userId: number,
  ) {}
}
"@

Set-Content "src/domain/entities/Certification.ts" @"
export class Certification {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly url: string,
    public readonly startDate: Date,
    public readonly endDate: Date | null,
    public readonly isPublished: boolean,
    public readonly userId: number,
  ) {}
}
"@

Set-Content "src/domain/entities/SocialAccount.ts" @"
export class SocialAccount {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly url: string,
    public readonly imageUrl: string,
    public readonly isPublic: boolean,
    public readonly userId: number,
  ) {}
}
"@

Set-Content "src/domain/entities/ContactMe.ts" @"
export class ContactMe {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly email: string,
    public readonly message: string,
    public readonly ipAddress: string,
    public readonly browserInfo: string,
    public readonly createdAt: Date,
  ) {}
}
"@

Set-Content "src/domain/entities/PageView.ts" @"
export class PageView {
  constructor(
    public readonly id: number,
    public readonly route: string,
    public readonly count: number,
    public readonly lastViewedAt: Date,
  ) {}
}
"@

# ─── Domain / Value Objects ───────────────────────────────────────────────────

Set-Content "src/domain/value-objects/Email.ts" @"
import { ValidationError } from '../errors/ValidationError'

export class Email {
  private readonly value: string

  constructor(email: string) {
    if (!Email.isValid(email)) throw new ValidationError(`Invalid email: ${email}`)
    this.value = email.toLowerCase().trim()
  }

  static isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  toString(): string { return this.value }
}
"@

Set-Content "src/domain/value-objects/Slug.ts" @"
export class Slug {
  private readonly value: string

  constructor(raw: string) {
    this.value = raw.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  static from(title: string): Slug { return new Slug(title) }

  toString(): string { return this.value }
}
"@

Set-Content "src/domain/value-objects/DateRange.ts" @"
import { ValidationError } from '../errors/ValidationError'

export class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date | null,
  ) {
    if (end && end < start) throw new ValidationError('End date cannot be before start date')
  }

  get isOngoing(): boolean { return this.end === null }
}
"@

# ─── Domain / Errors ─────────────────────────────────────────────────────────

Set-Content "src/domain/errors/DomainError.ts" @"
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
"@

Set-Content "src/domain/errors/ValidationError.ts" @"
import { DomainError } from './DomainError'
export class ValidationError extends DomainError {}
"@

Set-Content "src/domain/errors/NotFoundError.ts" @"
import { DomainError } from './DomainError'
export class NotFoundError extends DomainError {}
"@

Set-Content "src/domain/errors/UnauthorizedError.ts" @"
import { DomainError } from './DomainError'
export class UnauthorizedError extends DomainError {}
"@

# ─── Domain / Events ─────────────────────────────────────────────────────────

Set-Content "src/domain/events/ContactSubmittedEvent.ts" @"
export class ContactSubmittedEvent {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly message: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
"@

Set-Content "src/domain/events/ProjectViewedEvent.ts" @"
export class ProjectViewedEvent {
  constructor(
    public readonly projectId: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
"@

Set-Content "src/domain/events/BlogPublishedEvent.ts" @"
export class BlogPublishedEvent {
  constructor(
    public readonly blogId: number,
    public readonly slug: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
"@

# ─── Domain / Repository Interfaces ──────────────────────────────────────────

Set-Content "src/domain/repositories/project/IProjectReadRepository.ts" @"
import { Project } from '../../entities/Project'

export interface IProjectReadRepository {
  findAll(): Promise<Project[]>
  findPublished(): Promise<Project[]>
  findById(id: number): Promise<Project | null>
  findBySlug(slug: string): Promise<Project | null>
}
"@

Set-Content "src/domain/repositories/project/IProjectWriteRepository.ts" @"
import { Project } from '../../entities/Project'

export interface IProjectWriteRepository {
  create(data: Omit<Project, 'id'>): Promise<Project>
  update(id: number, data: Partial<Project>): Promise<Project>
  delete(id: number): Promise<void>
}
"@

Set-Content "src/domain/repositories/blog/IBlogReadRepository.ts" @"
import { Blog } from '../../entities/Blog'

export interface IBlogReadRepository {
  findAll(): Promise<Blog[]>
  findPublished(): Promise<Blog[]>
  findBySlug(slug: string): Promise<Blog | null>
}
"@

Set-Content "src/domain/repositories/blog/IBlogWriteRepository.ts" @"
import { Blog } from '../../entities/Blog'

export interface IBlogWriteRepository {
  create(data: Omit<Blog, 'id'>): Promise<Blog>
  update(id: number, data: Partial<Blog>): Promise<Blog>
  delete(id: number): Promise<void>
}
"@

Set-Content "src/domain/repositories/contact/IContactWriteRepository.ts" @"
import { ContactMe } from '../../entities/ContactMe'

export interface IContactWriteRepository {
  save(data: Omit<ContactMe, 'id'>): Promise<ContactMe>
}
"@

Set-Content "src/domain/repositories/analytics/IPageViewRepository.ts" @"
import { PageView } from '../../entities/PageView'

export interface IPageViewRepository {
  increment(route: string): Promise<void>
  findAll(): Promise<PageView[]>
}
"@

# ─── Application / Ports ─────────────────────────────────────────────────────

Set-Content "src/application/ports/ITurnstileVerifier.ts" @"
export interface ITurnstileVerifier {
  verifyToken(token: string): Promise<boolean>
}
"@

Set-Content "src/application/ports/ISpotifyService.ts" @"
export interface TrackData {
  isPlaying: boolean
  title: string
  artist: string
  albumArt: string
  songUrl: string
}

export interface ISpotifyService {
  getNowPlaying(): Promise<TrackData>
}
"@

Set-Content "src/application/ports/IMailService.ts" @"
export interface IMailService {
  send(to: string, subject: string, body: string): Promise<void>
}
"@

Set-Content "src/application/ports/ILogger.ts" @"
export interface ILogger {
  log(message: string, context?: string): void
  warn(message: string, context?: string): void
  error(message: string, trace?: string, context?: string): void
}
"@

Set-Content "src/application/ports/IUnitOfWork.ts" @"
export interface IUnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
}
"@

# ─── Application / DTOs ──────────────────────────────────────────────────────

Set-Content "src/application/dtos/ProjectDTO.ts" @"
export interface ProjectDTO {
  id: number
  name: string
  description: string
  slug: string
  techStack: string[]
  isOpenSource: boolean
  createdAt: string
  updatedAt: string
}
"@

Set-Content "src/application/dtos/BlogDTO.ts" @"
export interface BlogDTO {
  id: number
  title: string
  slug: string
  content: string
  tags: string[]
  createdAt: string
}
"@

Set-Content "src/application/dtos/TrackDTO.ts" @"
export interface TrackDTO {
  isPlaying: boolean
  title: string
  artist: string
  albumArt: string
  songUrl: string
}
"@

# ─── Application / Use Cases / Queries ───────────────────────────────────────

Set-Content "src/application/use-cases/queries/project/GetPublishedProjectsQuery.ts" @"
import { Injectable } from '@nestjs/common'
import { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import { ProjectDTO } from '../../../dtos/ProjectDTO'

@Injectable()
export class GetPublishedProjectsQuery {
  constructor(private readonly repo: IProjectReadRepository) {}

  async execute(): Promise<ProjectDTO[]> {
    const projects = await this.repo.findPublished()
    return projects.map((p) => ({
      id: p.id, name: p.name, description: p.description, slug: p.slug,
      techStack: p.techStack, isOpenSource: p.isOpenSource,
      createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
    }))
  }
}
"@

Set-Content "src/application/use-cases/queries/project/GetProjectBySlugQuery.ts" @"
import { Injectable } from '@nestjs/common'
import { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import { ProjectDTO } from '../../../dtos/ProjectDTO'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

@Injectable()
export class GetProjectBySlugQuery {
  constructor(private readonly repo: IProjectReadRepository) {}

  async execute(slug: string): Promise<ProjectDTO> {
    const project = await this.repo.findBySlug(slug)
    if (!project) throw new NotFoundError(`Project not found: ${slug}`)
    return {
      id: project.id, name: project.name, description: project.description,
      slug: project.slug, techStack: project.techStack, isOpenSource: project.isOpenSource,
      createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString(),
    }
  }
}
"@

Set-Content "src/application/use-cases/queries/blog/GetPublishedBlogsQuery.ts" @"
import { Injectable } from '@nestjs/common'
import { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import { BlogDTO } from '../../../dtos/BlogDTO'

@Injectable()
export class GetPublishedBlogsQuery {
  constructor(private readonly repo: IBlogReadRepository) {}

  async execute(): Promise<BlogDTO[]> {
    const blogs = await this.repo.findPublished()
    return blogs.map((b) => ({
      id: b.id, title: b.title, slug: b.slug,
      content: b.content, tags: b.tags, createdAt: b.createdAt.toISOString(),
    }))
  }
}
"@

Set-Content "src/application/use-cases/queries/analytics/GetNowPlayingQuery.ts" @"
import { Injectable } from '@nestjs/common'
import { ISpotifyService } from '../../../ports/ISpotifyService'
import { TrackDTO } from '../../../dtos/TrackDTO'

@Injectable()
export class GetNowPlayingQuery {
  constructor(private readonly spotify: ISpotifyService) {}

  async execute(): Promise<TrackDTO> {
    return this.spotify.getNowPlaying()
  }
}
"@

# ─── Application / Use Cases / Commands ──────────────────────────────────────

Set-Content "src/application/use-cases/commands/contact/SubmitContactCommand.ts" @"
import { Injectable } from '@nestjs/common'
import { IContactWriteRepository } from '../../../../domain/repositories/contact/IContactWriteRepository'
import { ITurnstileVerifier } from '../../../ports/ITurnstileVerifier'
import { IMailService } from '../../../ports/IMailService'
import { ILogger } from '../../../ports/ILogger'
import { ContactSubmittedEvent } from '../../../../domain/events/ContactSubmittedEvent'
import { ValidationError } from '../../../../domain/errors/ValidationError'
import { Email } from '../../../../domain/value-objects/Email'

interface Input {
  name: string
  email: string
  message: string
  turnstileToken: string
  ipAddress: string
  browserInfo: string
}

@Injectable()
export class SubmitContactCommand {
  constructor(
    private readonly repo: IContactWriteRepository,
    private readonly turnstile: ITurnstileVerifier,
    private readonly mail: IMailService,
    private readonly logger: ILogger,
  ) {}

  async execute(input: Input): Promise<void> {
    const isHuman = await this.turnstile.verifyToken(input.turnstileToken)
    if (!isHuman) throw new ValidationError('Turnstile verification failed')

    const email = new Email(input.email)

    await this.repo.save({
      name: input.name, email: email.toString(), message: input.message,
      ipAddress: input.ipAddress, browserInfo: input.browserInfo, createdAt: new Date(),
    })

    const event = new ContactSubmittedEvent(input.name, email.toString(), input.message)
    await this.mail.send('your@email.com', `New message from ${event.name}`, event.message)
    this.logger.log(`Contact submitted by ${event.name}`, 'SubmitContactCommand')
  }
}
"@

Set-Content "src/application/use-cases/commands/project/CreateProjectCommand.ts" @"
import { Injectable } from '@nestjs/common'
import { IProjectWriteRepository } from '../../../../domain/repositories/project/IProjectWriteRepository'
import { Slug } from '../../../../domain/value-objects/Slug'
import { ProjectDTO } from '../../../dtos/ProjectDTO'

interface Input {
  name: string
  description: string
  techStack: string[]
  isOpenSource: boolean
  isPublished: boolean
  userId: number
}

@Injectable()
export class CreateProjectCommand {
  constructor(private readonly repo: IProjectWriteRepository) {}

  async execute(input: Input): Promise<ProjectDTO> {
    const slug = Slug.from(input.name)
    const now = new Date()
    const project = await this.repo.create({ ...input, slug: slug.toString(), createdAt: now, updatedAt: now })
    return {
      id: project.id, name: project.name, description: project.description,
      slug: project.slug, techStack: project.techStack, isOpenSource: project.isOpenSource,
      createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString(),
    }
  }
}
"@

# ─── Application / Event Handlers ────────────────────────────────────────────

Set-Content "src/application/event-handlers/OnContactSubmitted.ts" @"
import { Injectable } from '@nestjs/common'
import { ContactSubmittedEvent } from '../../domain/events/ContactSubmittedEvent'
import { ILogger } from '../ports/ILogger'

@Injectable()
export class OnContactSubmitted {
  constructor(private readonly logger: ILogger) {}

  async handle(event: ContactSubmittedEvent): Promise<void> {
    this.logger.log(`Contact received from ${event.name} <${event.email}>`, 'OnContactSubmitted')
  }
}
"@

# ─── Infrastructure / Database / Prisma ──────────────────────────────────────

Set-Content "src/infrastructure/database/prisma/prisma.service.ts" @"
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect() }
  async onModuleDestroy() { await this.$disconnect() }
}
"@

# ─── Infrastructure / Database / Unit of Work ────────────────────────────────

Set-Content "src/infrastructure/database/unit-of-work/PrismaUnitOfWork.ts" @"
import { Injectable } from '@nestjs/common'
import { IUnitOfWork } from '../../../application/ports/IUnitOfWork'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async begin(): Promise<void> { /* Prisma handles transactions via $transaction */ }
  async commit(): Promise<void> { /* No-op: use prisma.$transaction(() => ...) instead */ }
  async rollback(): Promise<void> { /* Handled automatically by Prisma on error */ }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn)
  }
}
"@

# ─── Infrastructure / Database / Mappers ─────────────────────────────────────

Set-Content "src/infrastructure/database/mappers/ProjectMapper.ts" @"
import { Project as PrismaProject } from '@prisma/client'
import { Project } from '../../../domain/entities/Project'

export class ProjectMapper {
  static toDomain(raw: PrismaProject): Project {
    return new Project(
      raw.id, raw.name, raw.description, raw.slug,
      JSON.parse(raw.techStack), raw.isPublished, raw.isOpenSource,
      raw.userId, raw.createdAt, raw.updatedAt,
    )
  }

  static toPrisma(domain: Omit<Project, 'id'>) {
    return {
      name: domain.name, description: domain.description, slug: domain.slug,
      techStack: JSON.stringify(domain.techStack), isPublished: domain.isPublished,
      isOpenSource: domain.isOpenSource, userId: domain.userId,
    }
  }
}
"@

Set-Content "src/infrastructure/database/mappers/BlogMapper.ts" @"
import { Blog as PrismaBlog } from '@prisma/client'
import { Blog } from '../../../domain/entities/Blog'

export class BlogMapper {
  static toDomain(raw: PrismaBlog): Blog {
    return new Blog(
      raw.id, raw.title, raw.slug, raw.content,
      JSON.parse(raw.tags), raw.isPublished, raw.userId, raw.createdAt, raw.updatedAt,
    )
  }
}
"@

# ─── Infrastructure / Database / Repositories ────────────────────────────────

Set-Content "src/infrastructure/database/repositories/PrismaProjectRepository.ts" @"
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { IProjectReadRepository } from '../../../domain/repositories/project/IProjectReadRepository'
import { IProjectWriteRepository } from '../../../domain/repositories/project/IProjectWriteRepository'
import { Project } from '../../../domain/entities/Project'
import { ProjectMapper } from '../mappers/ProjectMapper'

@Injectable()
export class PrismaProjectRepository implements IProjectReadRepository, IProjectWriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() { return (await this.prisma.project.findMany()).map(ProjectMapper.toDomain) }
  async findPublished() { return (await this.prisma.project.findMany({ where: { isPublished: true } })).map(ProjectMapper.toDomain) }
  async findById(id: number) { const r = await this.prisma.project.findUnique({ where: { id } }); return r ? ProjectMapper.toDomain(r) : null }
  async findBySlug(slug: string) { const r = await this.prisma.project.findUnique({ where: { slug } }); return r ? ProjectMapper.toDomain(r) : null }

  async create(data: Omit<Project, 'id'>) {
    const r = await this.prisma.project.create({ data: ProjectMapper.toPrisma(data) })
    return ProjectMapper.toDomain(r)
  }
  async update(id: number, data: Partial<Project>) {
    const r = await this.prisma.project.update({ where: { id }, data })
    return ProjectMapper.toDomain(r)
  }
  async delete(id: number) { await this.prisma.project.delete({ where: { id } }) }
}
"@

# ─── Infrastructure / Cloudflare ─────────────────────────────────────────────

Set-Content "src/infrastructure/cloudflare/TurnstileVerifier.ts" @"
import { Injectable } from '@nestjs/common'
import { ITurnstileVerifier } from '../../application/ports/ITurnstileVerifier'

@Injectable()
export class TurnstileVerifier implements ITurnstileVerifier {
  private readonly secretKey = process.env.TURNSTILE_SECRET_KEY ?? ''

  async verifyToken(token: string): Promise<boolean> {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: this.secretKey, response: token }),
    })
    const data = await res.json() as { success: boolean }
    return data.success
  }
}
"@

# ─── Infrastructure / Spotify ────────────────────────────────────────────────

Set-Content "src/infrastructure/spotify/SpotifyService.ts" @"
import { Injectable } from '@nestjs/common'
import { ISpotifyService, TrackData } from '../../application/ports/ISpotifyService'

@Injectable()
export class SpotifyService implements ISpotifyService {
  private readonly clientId = process.env.SPOTIFY_CLIENT_ID ?? ''
  private readonly clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? ''
  private readonly refreshToken = process.env.SPOTIFY_REFRESH_TOKEN ?? ''

  private async getAccessToken(): Promise<string> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.refreshToken }),
    })
    const data = await res.json() as { access_token: string }
    return data.access_token
  }

  async getNowPlaying(): Promise<TrackData> {
    const token = await this.getAccessToken()
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 204) return { isPlaying: false, title: '', artist: '', albumArt: '', songUrl: '' }
    const data = await res.json() as any
    return {
      isPlaying: data.is_playing,
      title: data.item?.name ?? '',
      artist: data.item?.artists?.map((a: any) => a.name).join(', ') ?? '',
      albumArt: data.item?.album?.images?.[0]?.url ?? '',
      songUrl: data.item?.external_urls?.spotify ?? '',
    }
  }
}
"@

# ─── Infrastructure / Mail ───────────────────────────────────────────────────

Set-Content "src/infrastructure/mail/MailService.ts" @"
import { Injectable } from '@nestjs/common'
import { IMailService } from '../../application/ports/IMailService'

@Injectable()
export class MailService implements IMailService {
  async send(to: string, subject: string, body: string): Promise<void> {
    // Wire Resend here: https://resend.com/docs/send-with-nodejs
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({ from: 'portfolio@yourdomain.com', to, subject, html: body })
    console.log(`[Mail] To: ${to} | Subject: ${subject}`)
  }
}
"@

# ─── Infrastructure / Logging ────────────────────────────────────────────────

Set-Content "src/infrastructure/logging/NestLogger.ts" @"
import { Injectable, Logger } from '@nestjs/common'
import { ILogger } from '../../application/ports/ILogger'

@Injectable()
export class NestLogger implements ILogger {
  private readonly logger = new Logger()
  log(message: string, context?: string) { this.logger.log(message, context) }
  warn(message: string, context?: string) { this.logger.warn(message, context) }
  error(message: string, trace?: string, context?: string) { this.logger.error(message, trace, context) }
}
"@

# ─── Interface Adapters / Guards ─────────────────────────────────────────────

Set-Content "src/interface-adapters/guards/JwtAuthGuard.ts" @"
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: unknown }>()
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new UnauthorizedException()
    try {
      req.user = this.jwt.verify(token)
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
"@

Set-Content "src/interface-adapters/guards/TurnstileGuard.ts" @"
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { TurnstileVerifier } from '../../infrastructure/cloudflare/TurnstileVerifier'

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private readonly turnstile: TurnstileVerifier) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ body: { turnstileToken?: string } }>()
    const token = req.body?.turnstileToken
    if (!token) throw new ForbiddenException('Missing Turnstile token')
    const valid = await this.turnstile.verifyToken(token)
    if (!valid) throw new ForbiddenException('Turnstile verification failed')
    return true
  }
}
"@

# ─── Interface Adapters / Filters ────────────────────────────────────────────

Set-Content "src/interface-adapters/filters/DomainExceptionFilter.ts" @"
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { DomainError } from '../../domain/errors/DomainError'
import { NotFoundError } from '../../domain/errors/NotFoundError'
import { ValidationError } from '../../domain/errors/ValidationError'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    let status = HttpStatus.INTERNAL_SERVER_ERROR
    if (exception instanceof NotFoundError)     status = HttpStatus.NOT_FOUND
    if (exception instanceof ValidationError)   status = HttpStatus.BAD_REQUEST
    if (exception instanceof UnauthorizedError) status = HttpStatus.UNAUTHORIZED
    res.status(status).json({ statusCode: status, message: exception.message, error: exception.name })
  }
}
"@

# ─── Interface Adapters / Modules ────────────────────────────────────────────

Set-Content "src/interface-adapters/modules/project/project.dto.ts" @"
import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator'

export class CreateProjectDto {
  @IsString() name: string
  @IsString() description: string
  @IsArray() techStack: string[]
  @IsBoolean() isOpenSource: boolean
  @IsBoolean() @IsOptional() isPublished?: boolean
}
"@

Set-Content "src/interface-adapters/modules/project/project.presenter.ts" @"
import { ProjectDTO } from '../../../application/dtos/ProjectDTO'

export class ProjectPresenter {
  static toResponse(dto: ProjectDTO) {
    return { ...dto }
  }

  static toListResponse(dtos: ProjectDTO[]) {
    return dtos.map(ProjectPresenter.toResponse)
  }
}
"@

Set-Content "src/interface-adapters/modules/project/project.controller.ts" @"
import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { ProjectPresenter } from './project.presenter'

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly getPublished: GetPublishedProjectsQuery,
    private readonly getBySlug: GetProjectBySlugQuery,
  ) {}

  @Get()
  async findAll() {
    const dtos = await this.getPublished.execute()
    return ProjectPresenter.toListResponse(dtos)
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const dto = await this.getBySlug.execute(slug)
    return ProjectPresenter.toResponse(dto)
  }
}
"@

Set-Content "src/interface-adapters/modules/project/project.module.ts" @"
import { Module } from '@nestjs/common'
import { ProjectController } from './project.controller'
import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { PrismaProjectRepository } from '../../../infrastructure/database/repositories/PrismaProjectRepository'
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service'

@Module({
  controllers: [ProjectController],
  providers: [
    PrismaService,
    PrismaProjectRepository,
    { provide: 'IProjectReadRepository', useExisting: PrismaProjectRepository },
    { provide: 'IProjectWriteRepository', useExisting: PrismaProjectRepository },
    GetPublishedProjectsQuery,
    GetProjectBySlugQuery,
  ],
})
export class ProjectModule {}
"@

Set-Content "src/interface-adapters/modules/contact/contact.dto.ts" @"
import { IsString, IsEmail, Length } from 'class-validator'

export class SubmitContactDto {
  @IsString() @Length(1, 60) name: string
  @IsEmail() email: string
  @IsString() @Length(1, 300) message: string
  @IsString() turnstileToken: string
}
"@

Set-Content "src/interface-adapters/modules/contact/contact.controller.ts" @"
import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { TurnstileGuard } from '../../guards/TurnstileGuard'
import { SubmitContactDto } from './contact.dto'
import { Request } from 'express'

@Controller('contact')
export class ContactController {
  constructor(private readonly submit: SubmitContactCommand) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseGuards(TurnstileGuard)
  async submit(@Body() dto: SubmitContactDto, @Req() req: Request) {
    await this.submit.execute({
      ...dto,
      ipAddress: req.ip ?? '',
      browserInfo: req.headers['user-agent'] ?? '',
    })
    return { success: true }
  }
}
"@

Set-Content "src/interface-adapters/modules/spotify/spotify.controller.ts" @"
import { Controller, Get } from '@nestjs/common'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'

@Controller('spotify')
export class SpotifyController {
  constructor(private readonly query: GetNowPlayingQuery) {}

  @Get('now-playing')
  async nowPlaying() {
    return this.query.execute()
  }
}
"@

Set-Content "src/interface-adapters/modules/auth/auth.controller.ts" @"
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { IsString } from 'class-validator'

class LoginDto {
  @IsString() password: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly jwt: JwtService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    if (dto.password !== process.env.ADMIN_PASSWORD) throw new UnauthorizedException()
    const token = this.jwt.sign({ role: 'admin' })
    return { token }
  }
}
"@

# ─── App Module ───────────────────────────────────────────────────────────────

Set-Content "src/app.module.ts" @"
import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { JwtModule } from '@nestjs/jwt'
import { APP_FILTER } from '@nestjs/core'
import { ProjectModule } from './interface-adapters/modules/project/project.module'
import { DomainExceptionFilter } from './interface-adapters/filters/DomainExceptionFilter'

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'changeme', signOptions: { expiresIn: '7d' }, global: true }),
    ProjectModule,
    // BlogModule, ContactModule, AuthModule, SpotifyModule — add as you build them
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
"@

# ─── .env ────────────────────────────────────────────────────────────────────

Set-Content ".env" @"
DATABASE_URL=postgresql://user:password@localhost:5432/portfolio
JWT_SECRET=change_me_in_production
ADMIN_PASSWORD=change_me_in_production
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token
RESEND_API_KEY=your_resend_api_key
"@

Write-Host ""
Write-Host "Backend scaffold complete!" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  npm install @nestjs/throttler @nestjs/jwt @nestjs/passport class-validator class-transformer" -ForegroundColor White
Write-Host "  npm install @prisma/client prisma" -ForegroundColor White
Write-Host "  npx prisma init" -ForegroundColor White
