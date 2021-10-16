import { UserBook } from '../models'
import { apiFetch } from './internal'

interface UserBookUpdateRequest {
    current_page: number
}

export async function update(
    bookID: string,
    req: UserBookUpdateRequest,
): Promise<UserBook> {
    return await apiFetch(`/api/books/${bookID}/user-book`, {
        method: 'POST',
        body: JSON.stringify(req),
    })
}
