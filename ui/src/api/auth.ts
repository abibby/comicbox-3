import { useEffect, useState } from 'preact/hooks'
import { apiFetch, getAuthToken, setAuthToken } from 'src/api/internal'
import { clearDatabase } from 'src/database'
import jwt, { JWT } from 'src/jwt'

export interface LoginRequest {
    username: string
    password: string
}
export interface LoginResponse {
    token: string
    image_token: string
    refresh_token: string
}
export async function login(req: LoginRequest): Promise<LoginResponse> {
    const response = await apiFetch<LoginResponse>('/api/login', {
        method: 'POST',
        body: JSON.stringify(req),
    })

    setAuthToken(response)

    return response
}

export async function logout(): Promise<void> {
    clearDatabase()
    await setAuthToken(null)
}

export async function currentID(): Promise<string | null> {
    const token = await getAuthToken()
    if (token === null) {
        return null
    }
    const a = jwt.parse(token)

    return a.claims.client_id
}

interface UserCreateTokenResponse {
    token: string
}

export async function userCreateToken(): Promise<string> {
    const response = await apiFetch<UserCreateTokenResponse>(
        '/api/users/create-token',
    )

    return response.token
}

export function useJWTClaims(): JWT | null {
    const [claims, setClaims] = useState<JWT | null>(null)
    useEffect(() => {
        getAuthToken().then(t => {
            if (t === null) {
                setClaims(null)
            } else {
                setClaims(jwt.parse(t))
            }
        })
    }, [])
    return claims
}
