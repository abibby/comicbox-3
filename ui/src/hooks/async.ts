import { Inputs, useCallback, useEffect, useState } from 'preact/hooks'

export type UseAsyncResult<T, E> =
    | {
          status: 'pending'
          data?: undefined
          error?: undefined
      }
    | {
          status: 'success'
          data: T
          error?: undefined
      }
    | {
          status: 'error'
          data?: undefined
          error: E
      }
export function useAsync<T, E = Error>(
    asyncFunction: () => Promise<T>,
): UseAsyncResult<T, E> {
    const [result, setResult] = useState<UseAsyncResult<T, E>>({
        status: 'pending',
    })
    useEffect(() => {
        let canceled = false
        setResult({ status: 'pending' })
        asyncFunction()
            .then(r => {
                if (canceled) {
                    return
                }
                setResult({
                    status: 'success',
                    data: r,
                })
            })
            .catch(e => {
                if (canceled) {
                    return
                }
                setResult({
                    status: 'error',
                    error: e,
                })
            })
        return () => {
            canceled = true
        }
    }, [asyncFunction, setResult])
    return result
}

export function useAsyncCallback<T, E = Error>(
    callback: () => Promise<T>,
    inputs: Inputs,
): UseAsyncResult<T, E> {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const asyncFunction = useCallback(callback, inputs)
    return useAsync(asyncFunction)
}
