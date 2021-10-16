import { FunctionalComponent, h } from 'preact'
import { useCallback, useRef } from 'preact/hooks'

const submittableElements = [
    HTMLButtonElement,
    HTMLSelectElement,
    HTMLInputElement,
    HTMLTextAreaElement,
] as const

interface FormProps {
    onSubmit(data: Map<string, string>): void
}

export const Form: FunctionalComponent<FormProps> = props => {
    const form = useRef<HTMLFormElement>(null)
    const onSubmit = useCallback(
        (e: Event) => {
            e.preventDefault()
            if (!form.current) {
                return
            }
            const data = new Map(
                Array.from(new FormData(form.current).entries()).map(
                    ([key, value]) => [key, value.toString()],
                ),
            )

            const submitted = document.activeElement
            if (isSubmittable(submitted) && submitted.name !== '') {
                data.set(submitted.name, submitted.value)
            }

            props.onSubmit(data)
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
