import { ComponentChildren, FunctionalComponent, h } from 'preact'
import classNames from 'src/classnames'
import styles from 'src/components/form/form-element.module.css'
import { useErrors } from 'src/components/form/form'

export interface FormElementOptions {
    title: string
    name: string
    children?: ComponentChildren
}

export interface FormElementProps {
    props: FormElementOptions
}

export const FormElement: FunctionalComponent<FormElementProps> = props => {
    const allErrors = useErrors()
    let errors: string[] | undefined
    if (allErrors && props.props.name in allErrors) {
        errors = allErrors[props.props.name]
    }

    return (
        <label
            class={classNames(styles.formElement, {
                [styles.hasErrors]: errors !== undefined,
            })}
        >
            <span class={styles.title}>
                {props.props.title}

                {errors !== undefined && (
                    <span class={styles.errors}>{errors}</span>
                )}
            </span>
            <div class={styles.inputWrapper}>
                {props.children}
                {props.props.children && (
                    <div class={styles.extras}>{props.props.children}</div>
                )}
            </div>
        </label>
    )
}
