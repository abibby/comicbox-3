import { sleep } from 'helpers/sleep'
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
    asyncFunction: (signal: AbortSignal) => Promise<T>,
): UseAsyncResult<T, E> {
    const [result, setResult] = useState<UseAsyncResult<T, E>>({
        status: 'pending',
    })
    useEffect(() => {
        const abort = new AbortController()
        setResult({ status: 'pending' })
        asyncFunction(abort.signal)
            .then(r => {
                if (abort.signal.aborted) {
                    return
                }
                setResult({
                    status: 'success',
                    data: r,
                })
            })
            .catch(e => {
                if (abort.signal.aborted) {
                    return
                }
                setResult({
                    status: 'error',
                    error: e,
                })
            })
        return () => abort.abort()
    }, [asyncFunction, setResult])
    return result
}

export function useAsyncCallback<T, E = Error>(
    callback: (signal: AbortSignal) => Promise<T>,
    inputs: Inputs,
): UseAsyncResult<T, E> {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const asyncFunction = useCallback(callback, inputs)
    return useAsync(asyncFunction)
}

export function useDebouncedAsyncCallback<T, E = Error>(
    callback: (signal: AbortSignal) => Promise<T>,
    inputs: Inputs,
): UseAsyncResult<T, E> {
    const asyncFunction = useCallback(async (s: AbortSignal): Promise<T> => {
        await sleep(500)
        if (s.aborted) {
            throw new Error('aborted')
        }
        return callback(s)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, inputs)
    return useAsync(asyncFunction)
}
