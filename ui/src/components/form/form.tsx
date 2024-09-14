import { createContext, Fragment, FunctionalComponent, h, JSX } from 'preact'
import {
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'preact/hooks'
import { FetchError } from 'src/api'
import { notNullish } from 'src/util'
import styles from 'src/components/form/form.module.css'

export type Errors = {
    [key: string]: string[]
}

const errorsContext = createContext<{
    field: Errors
    global: string | undefined
}>({
    field: {},
    global: undefined,
})

export class Data {
    constructor(private data: FormData) {}

    public get(name: string): string | null {
        const result = this.data.get(name)
        if (typeof result !== 'string') {
            return null
        }
        return result
    }
    public getNumber(name: string): number | null {
        const result = this.get(name)
        if (result === null || result === '') {
            return null
        }
        return Number(result)
    }
    public getBoolean(name: string): boolean | null {
        const result = this.get(name)

        if (result === null) {
            return null
        }
        return result !== '0'
    }
    public getFile(name: string): File | null {
        const result = this.data.get(name)
        if (!(result instanceof File)) {
            return null
        }
        return result
    }
    public getAll(name: string): string[] | null {
        const result = this.data.getAll(name)
        if (result.length === 0) {
            return null
        }
        return result.filter((r): r is string => typeof r === 'string')
    }
}

const submittableElements = [
    HTMLButtonElement,
    HTMLSelectElement,
    HTMLInputElement,
    HTMLTextAreaElement,
] as const

interface FormProps {
    onSubmit(data: Data): void | Promise<void>
    errors?: Errors
}

export const Form: FunctionalComponent<FormProps> = ({
    children,
    onSubmit,
    errors,
}) => {
    const form = useRef<HTMLFormElement>(null)
    const [fetchErrors, setFetchErrors] = useState<Errors>({})
    const [globalError, setGlobalError] = useState<string>()
    const submit = useCallback(
        async (e: JSX.TargetedEvent<HTMLFormElement>) => {
            e.preventDefault()
            if (!form.current) {
                return
            }
            const data = new FormData(form.current)

            const submitted = document.activeElement
            if (isSubmittable(submitted) && submitted.name !== '') {
                data.set(submitted.name, submitted.value)
            }
            try {
                await onSubmit(new Data(data))
                setFetchErrors({})
                setGlobalError(undefined)
            } catch (e) {
                if (e instanceof FetchError) {
                    if (e.status === 422) {
                        setFetchErrors(e.body)
                        setGlobalError(undefined)
                    } else {
                        setFetchErrors({})
                        setGlobalError(e.body.error)
                    }
                } else {
                    throw e
                }
            }
        },
        [onSubmit],
    )

    const contextValue = useMemo(
        () => ({
            field: merge(fetchErrors, errors),
            global: globalError,
        }),
        [errors, fetchErrors, globalError],
    )

    const Provider = errorsContext.Provider
    return (
        <form onSubmit={submit} ref={form}>
            <Provider value={contextValue}>{children}</Provider>
        </form>
    )
}

export function useErrors(): Errors {
    return useContext(errorsContext).field
}
export function useGlobalErrors(): string | undefined {
    return useContext(errorsContext).global
}

export function GlobalErrors() {
    const err = useGlobalErrors()
    if (!err) {
        return <Fragment />
    }
    return <div class={styles.error}>{err}</div>
}

function merge(...errors: (Errors | undefined)[]): Errors {
    const realErrors = errors.filter(notNullish)
    if (realErrors.length === 0) {
        return {}
    }
    const result: Errors = {}
    for (const err of realErrors) {
        for (const [k, v] of Object.entries(err)) {
            if (result[k]) {
                result[k] = result[k].concat(v)
            } else {
                result[k] = v
            }
        }
    }
    return result
}

function isSubmittable(
    e: Element | null,
): e is (typeof submittableElements)[number]['prototype'] {
    for (const se of submittableElements) {
        if (e instanceof se) {
            return true
        }
    }
    return false
}
