import { FunctionalComponent, h } from 'preact'
import { FormElement, FormElementProps } from './form-element'

export interface SelectProps extends FormElementProps {
    name: string
    options: ReadonlyArray<readonly [string | number, string]>
    value: string | number
}

export const Select: FunctionalComponent<SelectProps> = props => {
    return (
        <FormElement title={props.title}>
            <select name={props.name} value={props.value}>
                {props.options.map(([value, title]) => (
                    <option value={value}>{title}</option>
                ))}
            </select>
        </FormElement>
    )
}