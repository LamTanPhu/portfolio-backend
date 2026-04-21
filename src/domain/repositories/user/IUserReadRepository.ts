import { User } from '../../entities/User'

export interface IUserReadRepository {
    findById(id: number): Promise<User | null>
    findByEmail(email: string): Promise<User | null>
}