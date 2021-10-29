import { Inputs, useEffect, useState } from 'preact/hooks'

export function useComputed<T>(compute: () => T, inputs: Inputs): T {
    const [value, setValue] = useState(compute())

    useEffect(() => {
        setValue(compute)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setValue, compute, ...inputs])

    return value
}
