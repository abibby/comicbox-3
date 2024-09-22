export interface Headers {
    typ: string
    alg: string
}

export interface Claims {
    iss?: string // Issuer Claim
    sub: string // Subject Claim
    aud?: string // Audience Claim
    exp: string // Expiration Time Claim
    nbf?: string // Not Before Claim
    iat: string // Issued At Claim
    jti?: string // JWT ID Claim
    scope: string
}

export interface JWT {
    claims: Claims
    headers: Headers
}

export default {
    parse(token: string): JWT {
        const [headers, claims] = token.split('.')
        if (headers === undefined || claims === undefined) {
            throw new Error('invalid JWT')
        }
        return {
            claims: JSON.parse(atob(claims)),
            headers: JSON.parse(atob(headers)),
        }
    },
}
