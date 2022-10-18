import { FunctionalComponent, h, JSX } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { FormElement, FormElementProps } from 'src/components/form/form-element'

export interface ToggleProps extends FormElementProps {
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
        <FormElement
            title={props.title}
            name={props.name}
            errors={props.errors}
        >
            <input type='hidden' name={props.name} value={value ? 1 : 0} />
            <input type='checkbox' checked={value} onInput={checkUpdate} />
        </FormElement>
    )
}
