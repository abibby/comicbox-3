import { useEffect, useState } from 'preact/hooks'
import { apiFetch, claims, getAuthToken, setAuthToken } from 'src/api/internal'
import { clearDatabase } from 'src/database'
import { useSignal } from 'src/hooks/signals'
import jwt, { Claims } from 'src/jwt'
import { User } from 'src/models'

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

    await setAuthToken(response)

    return response
}

export interface UserCurrentResponse {
    user: User
}
export async function userCurrent(): Promise<UserCurrentResponse> {
    return await apiFetch('/api/users/current')
}

export interface ChangePasswordRequest {
    old_password: string
    new_password: string
}
export interface ChangePasswordResponse {
    success: boolean
}
export async function changePassword(
    req: ChangePasswordRequest,
): Promise<ChangePasswordResponse> {
    return apiFetch<ChangePasswordResponse>('/api/users/password', {
        method: 'POST',
        body: JSON.stringify(req),
    })
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

    return a.claims.sub
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

export function useJWTClaims(): Claims | undefined {
    return useSignal(claims)
}

export function useUser(): User | undefined {
    const claims = useJWTClaims()
    const [user, setUser] = useState<User>()

    useEffect(() => {
        if (!claims) {
            setUser(undefined)
            return
        }
        void userCurrent().then(u => setUser(u.user))
    }, [claims])
    return user
}

void getAuthToken()
