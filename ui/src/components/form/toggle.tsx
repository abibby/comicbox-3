import { FunctionalComponent, h, JSX } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import {
    FormElement,
    FormElementOptions,
} from 'src/components/form/form-element'

export interface ToggleProps extends FormElementOptions {
    name: string
    value: boolean
}

export const Toggle: FunctionalComponent<ToggleProps> = props => {
    const [value, setValue] = useState(props.value)
    const checkUpdate = useCallback(
        (e: JSX.TargetedEvent<HTMLInputElement>) => {
            setValue(e.currentTarget.checked)
        },
        [setValue],
    )
    return (
        <FormElement props={props}>
            <input type='hidden' name={props.name} value={value ? 1 : 0} />
            <input type='checkbox' checked={value} onInput={checkUpdate} />
        </FormElement>
    )
}
