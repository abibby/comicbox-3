import { bindValue } from '@zwzn/spicy'
import { FunctionalComponent, h } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import {
    FormElement,
    FormElementOptions,
} from 'src/components/form/form-element'
import styles from 'src/components/form/form-element.module.css'

export interface InputProps extends FormElementOptions {
    type?: 'number' | 'text' | 'password'
    value?: string | number
    focused?: boolean
    step?: 'any' | number
    readonly?: boolean
    onInput?: (value: string) => void
}

export const Input: FunctionalComponent<InputProps> = props => {
    const input = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (props.focused) {
            input.current?.focus()
        }
    }, [props.focused])

    return (
        <FormElement props={props}>
            <input
                class={styles.input}
                type={props.type}
                name={props.name}
                value={props.value}
                step={props.step}
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
