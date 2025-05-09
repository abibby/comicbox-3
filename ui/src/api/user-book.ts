import { apiFetch } from 'src/api/internal'
import { UserBook, UserBookUpdateRequest } from 'src/models'

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
