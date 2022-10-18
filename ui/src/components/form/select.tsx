import { FunctionalComponent, h } from 'preact'
import { FormElement, FormElementProps } from 'src/components/form/form-element'

export interface SelectProps extends FormElementProps {
    name: string
    options: ReadonlyArray<readonly [string | number, string]>
    value: string | number
}

export const Select: FunctionalComponent<SelectProps> = props => {
    return (
        <FormElement
            title={props.title}
            name={props.name}
            errors={props.errors}
        >
            <select name={props.name} value={props.value}>
                {props.options.map(([value, title]) => (
                    <option key={value} value={value}>
                        {title}
                    </option>
                ))}
            </select>
        </FormElement>
    )
}
