import { FunctionalComponent, h } from 'preact'
import {
    FormElement,
    FormElementOptions,
} from 'src/components/form/form-element'
import styles from 'src/components/form/form-element.module.css'

export interface SelectProps extends FormElementOptions {
    name: string
    options: ReadonlyArray<readonly [string | number, string]>
    value?: string | number
}

export const Select: FunctionalComponent<SelectProps> = props => {
    return (
        <FormElement props={props}>
            <select name={props.name} value={props.value} class={styles.input}>
                {props.options.map(([value, title]) => (
                    <option key={value} value={value}>
                        {title}
                    </option>
                ))}
            </select>
        </FormElement>
    )
}
