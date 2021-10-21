import jwt from '../jwt'
import { apiFetch, getAuthToken, setAuthToken } from './internal'

export interface LoginRequest {
    username: string
    password: string
}
export interface LoginResponse {
    token: string
    image_token: string
}
export async function login(req: LoginRequest): Promise<LoginResponse> {
    const response = await apiFetch<LoginResponse>('/api/login', {
        method: 'POST',
        body: JSON.stringify(req),
    })

    setAuthToken(response.token, response.image_token)

    return response
}

export function logout(): void {
    setAuthToken(null, null)
}

export function currentID(): string | null {
    const token = getAuthToken()
    if (token === null) {
        return null
    }
    const a = jwt.parse(token)

    return a.claims.client_id
}
