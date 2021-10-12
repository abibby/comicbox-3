import { apiFetch, setAuthToken } from "./internal";


export interface LoginRequest {
    username: string
    password: string
}
export interface LoginResponse {
    token: string
    image_token: string
}
export async function login(req: LoginRequest): Promise<LoginResponse> {
    const response = await apiFetch<LoginResponse>("/api/login", {
        method: "POST",
        body: JSON.stringify(req),
    })

    setAuthToken(response.token, response.image_token)

    return response
}

export function logout(): void {
    setAuthToken(null, null)
}
