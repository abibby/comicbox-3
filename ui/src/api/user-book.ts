import { UserBook } from '../models'
import { apiFetch } from './internal'

interface UserBookUpdateRequest {
    current_page: number
    update_map: Record<string, string>
}

export async function update(
    bookID: string,
    req: UserBookUpdateRequest,
): Promise<UserBook> {
    return await apiFetch(
        `/api/books/${encodeURIComponent(bookID)}/user-book`,
        {
            method: 'POST',
            body: JSON.stringify(req),
        },
    )
}
