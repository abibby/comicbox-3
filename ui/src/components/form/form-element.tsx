import { FunctionalComponent, h } from 'preact'
import classNames from 'src/classnames'
import styles from 'src/components/form/form-element.module.css'
import { useErrors } from 'src/components/form/form'

export interface FormElementProps {
    title: string
    name: string
}

export const FormElement: FunctionalComponent<FormElementProps> = props => {
    const allErrors = useErrors()
    let errors: string[] | undefined
    if (allErrors && props.name in allErrors) {
        errors = allErrors[props.name]
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
