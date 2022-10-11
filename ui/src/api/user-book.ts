import { apiFetch } from 'src/api/internal'
import { UserBook } from 'src/models'

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
