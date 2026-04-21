export type SkillCategory = 'frontend' | 'backend' | 'devops' | 'database' | 'other'

export class Skill {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly imageUrl: string | null,
    public readonly category: SkillCategory,
    public readonly isPublic: boolean,
    public readonly userId: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}