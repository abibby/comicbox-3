import { FunctionalComponent, h } from 'preact'
import { FormElement, FormElementProps } from './form-element'

export interface InputProps extends FormElementProps {
    name: string
    type?: 'number' | 'text'
    value: string | number
}

export const Input: FunctionalComponent<InputProps> = props => {
    return (
        <FormElement title={props.title}>
            <input type={props.type} name={props.name} value={props.value} />
        </FormElement>
    )
}
