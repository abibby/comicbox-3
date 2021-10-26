import { FunctionalComponent, h } from 'preact'
import { FormElement, FormElementProps } from './form-element'

export interface ToggleProps extends FormElementProps {
    name: string
    value: boolean
}

export const Toggle: FunctionalComponent<ToggleProps> = props => {
    return (
        <FormElement title={props.title}>
            <input
                type='checkbox'
                name={props.name}
                value={'1'}
                checked={props.value}
            />
        </FormElement>
    )
}
