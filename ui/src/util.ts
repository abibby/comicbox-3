export function notNullish<T>(v: T | null | undefined): v is T {
    return v !== null && v !== undefined
}
