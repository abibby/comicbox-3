export function notNullish<T>(v: T | null | undefined): v is T {
    return v !== null && v !== undefined
}
export function truthy<T>(v: T | null | undefined | false): v is T {
    return !!v
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

export function splitPromise<T>() {
    let resolve: (v: T | PromiseLike<T>) => void
    let reject: (v?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return {
        promise,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        resolve,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        reject,
    }
}
