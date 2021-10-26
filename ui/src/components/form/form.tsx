import { FunctionalComponent, h } from 'preact'
import { useCallback, useRef } from 'preact/hooks'

export class Data {
    // eslint-disable-next-line no-useless-constructor
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
    public getBoolean(name: string): boolean {
        const result = this.get(name)

        if (result === null) {
            return false
        }
        return true
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
    onSubmit(data: Data): void
}

export const Form: FunctionalComponent<FormProps> = props => {
    const form = useRef<HTMLFormElement>(null)
    const onSubmit = useCallback(
        (e: Event) => {
            e.preventDefault()
            if (!form.current) {
                return
            }
            const data = new FormData(form.current)

            const submitted = document.activeElement
            if (isSubmittable(submitted) && submitted.name !== '') {
                data.set(submitted.name, submitted.value)
            }

            props.onSubmit(new Data(data))
        },
        [props.onSubmit],
    )
    return (
        <form onSubmit={onSubmit} ref={form}>
            {props.children}
        </form>
    )
}

function isSubmittable(
    e: Element | null,
): e is typeof submittableElements[number]['prototype'] {
    for (const se of submittableElements) {
        if (e instanceof se) {
            return true
        }
    }
    return false
}
