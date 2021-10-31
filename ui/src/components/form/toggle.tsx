import { FunctionalComponent, h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { FormElement, FormElementProps } from './form-element'

export interface ToggleProps extends FormElementProps {
    name: string
    value: boolean
}

export const Toggle: FunctionalComponent<ToggleProps> = props => {
    const [value, setValue] = useState(props.value)
    const checkUpdate = useCallback(
        (e: Event) => {
            const input = e.target
            if (input instanceof HTMLInputElement) {
                setValue(input.checked)
            }
        },
        [setValue],
    )
    return (
        <FormElement title={props.title}>
            <input type='hidden' name={props.name} value={value ? 1 : 0} />
            <input type='checkbox' checked={value} onInput={checkUpdate} />
        </FormElement>
    )
}
