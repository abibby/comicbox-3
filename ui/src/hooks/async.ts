import { useEffect, useState } from 'preact/hooks'

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

export function useAsync<T, TArgs extends Array<unknown>, E = Error>(
    callback: (...args: TArgs) => Promise<T>,
    args: TArgs,
): AsyncResponse<T, E> {
    const [value, setValue] = useState<AsyncResponse<T, E>>({
        loading: true,
        result: undefined,
        error: undefined,
    })

    useEffect(() => {
        callback(...args)
            .then(r => {
                setValue({
                    loading: false,
                    result: r,
                    error: undefined,
                })
            })
            .catch(e => {
                setValue({
                    loading: false,
                    result: undefined,
                    error: e,
                })
            })
    }, [setValue, ...args])

    return value
}
