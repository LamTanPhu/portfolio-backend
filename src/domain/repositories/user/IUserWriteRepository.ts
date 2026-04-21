import { User } from '../../entities/User'

export interface UpdateUserInput {
    firstname?: string
    lastname?: string
    aboutme?: string | null
    lastLogin?: Date
}

export interface IUserWriteRepository {
    update(id: number, data: UpdateUserInput): Promise<User>
}