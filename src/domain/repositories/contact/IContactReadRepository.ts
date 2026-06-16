// =============================================================================
// IContactReadRepository
//
// Read interface for ContactMe aggregate — admin use cases only.
// Separated from IContactWriteRepository per Interface Segregation Principle:
//   - SubmitContactCommand depends only on write (save)
//   - GetContactMessagesQuery depends only on read (findAll)
//   - DeleteContactMessageCommand depends only on write (delete)
// Neither use case ever needs the full repo interface.
// =============================================================================

import type { ContactMe } from '../../entities/ContactMe'

export interface IContactReadRepository {
    /** Returns all contact messages, newest first */
    findAll(): Promise<ContactMe[]>

    /** Returns a single message by PK — used by delete command to confirm existence */
    findById(id: number): Promise<ContactMe | null>
}