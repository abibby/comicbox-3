import { bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import {
    FormElement,
    FormElementOptions,
} from 'src/components/form/form-element'
import styles from 'src/components/form/form-element.module.css'

export interface TextAreaProps extends FormElementOptions {
    value?: string | number
    focused?: boolean
    readonly?: boolean
    onInput?: (value: string) => void
}

export const TextArea: FunctionalComponent<TextAreaProps> = props => {
    const input = useRef<HTMLTextAreaElement>(null)
    useEffect(() => {
        if (props.focused) {
            input.current?.focus()
        }
    }, [props.focused])

    return (
        <FormElement props={props}>
            <textarea
                class={styles.input}
                name={props.name}
                value={props.value}
                ref={input}
                readOnly={props.readonly}
                onInput={
                    props.onInput !== undefined
                        ? bindValue(props.onInput)
                        : undefined
                }
            />
        </FormElement>
    )
}
