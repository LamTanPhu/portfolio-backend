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

export interface ContactPage {
    items:      ContactMe[]
    nextCursor: number | null   // ID of the last item — pass as cursor on next request
    total:      number          // total row count for display ("Showing X of Y")
}

export interface IContactReadRepository {
    /**
     * Returns a page of contact messages, newest first.
     * cursor: return messages with id < cursor (i.e. older than the last seen row).
     * limit:  max rows to return — defaults to 20, capped at 100.
     */
    findPaginated(cursor?: number, limit?: number): Promise<ContactPage>

    /** Returns a single message by PK — used by delete command to confirm existence */
    findById(id: number): Promise<ContactMe | null>
}