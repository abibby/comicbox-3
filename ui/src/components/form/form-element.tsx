import { FunctionalComponent, h } from 'preact'
import classNames from 'src/classnames'
import styles from 'src/components/form/form-element.module.css'

export type Errors = {
    [key: string]: string[]
}

export interface FormElementProps {
    title: string
    errors?: Errors
    name: string
}

export const FormElement: FunctionalComponent<FormElementProps> = props => {
    let errors: string[] | undefined
    if (props.errors && props.name in props.errors) {
        errors = props.errors[props.name]
    }
    return (
        <label
            class={classNames(styles.formElement, {
                [styles.hasErrors]: errors !== undefined,
            })}
        >
            <span class={styles.title}>
                {props.title}

                {errors !== undefined && (
                    <span class={styles.errors}>{errors}</span>
                )}
            </span>
            {props.children}
        </label>
    )
}
