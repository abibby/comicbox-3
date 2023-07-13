import { apiFetch } from 'src/api/internal'

export async function bookSync(): Promise<void> {
    await apiFetch('/api/sync', {
        method: 'POST',
    })
}
