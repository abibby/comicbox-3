import { Inputs, useCallback, useEffect, useState } from 'preact/hooks'

export type UseAsyncResult<T, E> =
    | {
          status: 'pending'
      }
    | {
          status: 'success'
          data: T
      }
    | {
          status: 'error'
          error: E
      }
export function useAsync<T, E = Error>(
    asyncFunction: () => Promise<T>,
): UseAsyncResult<T, E> {
    const [result, setResult] = useState<UseAsyncResult<T, E>>({
        status: 'pending',
    })
    useEffect(() => {
        setResult({ status: 'pending' })
        asyncFunction()
            .then(r => {
                setResult({
                    status: 'success',
                    data: r,
                })
            })
            .catch(e => {
                setResult({
                    status: 'error',
                    error: e,
                })
            })
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
