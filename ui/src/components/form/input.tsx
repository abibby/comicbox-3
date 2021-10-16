import { FunctionalComponent, h } from 'preact'
import { FormElement, FormElementProps } from './form-element'

export interface InputProps extends FormElementProps {
    name: string
    type?: string
    value: string
}

export const Input: FunctionalComponent<InputProps> = props => {
    return (
        <FormElement title={props.title}>
            <input type={props.type} name={props.name} value={props.value} />
        </FormElement>
    )
}
