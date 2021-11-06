import { FunctionalComponent, h } from 'preact'
import { FormElement, FormElementProps } from './form-element'

export interface InputProps extends FormElementProps {
    type?: 'number' | 'text' | 'password'
    value?: string | number
}

export const Input: FunctionalComponent<InputProps> = props => {
    return (
        <FormElement
            title={props.title}
            name={props.name}
            errors={props.errors}
        >
            <input type={props.type} name={props.name} value={props.value} />
        </FormElement>
    )
}
