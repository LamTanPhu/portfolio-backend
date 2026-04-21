import { ContactMe } from '../../entities/ContactMe'

export interface IContactWriteRepository {
  save(data: Omit<ContactMe, 'id'>): Promise<ContactMe>
}
