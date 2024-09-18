export function notNullish<T>(v: T | null | undefined): v is T {
    return v !== null && v !== undefined
}

export function encode(
    fixed: TemplateStringsArray,
    ...parts: (string | number)[]
): string {
    let out = ''
    for (let i = 0; i < fixed.length; i++) {
        out += fixed[i]
        const part = parts[i]
        if (part) {
            out += encodeURIComponent(part)
        }
    }
    return out
}
