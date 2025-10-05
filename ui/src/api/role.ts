import { Role } from 'src/models'
import { apiFetch } from 'src/api/internal'

export async function index(): Promise<Role[]> {
    return await apiFetch('/api/roles', {})
}
