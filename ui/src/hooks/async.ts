import { Inputs, useEffect, useState } from "preact/hooks"

export type AsyncResponse<T, E> =
    | {
        loading: true
        result: undefined
        error: undefined
    }
    | {
        loading: false
        result: undefined
        error: E
    }
    | {
        loading: false
        result: T
        error: undefined
    }

export function useAsync<T, E = Error>(callback: () => Promise<T>, inputs: Inputs): AsyncResponse<T, E> {
    const [value, setValue] = useState<AsyncResponse<T,E>>({
        loading: true,
        result: undefined,
        error: undefined,
    })

    useEffect(() => {
        callback().then(r => {
            setValue({
                loading: false,
                result: r,
                error: undefined,
            })
        }).catch(e => {
            setValue({
                loading: false,
                result: undefined,
                error: e,
            })
        })
    }, [setValue, ...inputs])

    return value
}