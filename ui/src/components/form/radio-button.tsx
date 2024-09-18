import { createContext, FunctionalComponent, h } from 'preact'
import { useCallback, useContext } from 'preact/hooks'
import classNames from 'src/classnames'
import styles from 'src/components/form/radio-button.module.css'

const radioButtonContext = createContext<RadioButtonGroupProps | null>(null)

export interface RadioButtonGroupProps {
    value: string
    name: string
    onInput?: (v: string, e: Event) => void
}

export const RadioButtonGroup: FunctionalComponent<
    RadioButtonGroupProps
> = props => {
    const Provider = radioButtonContext.Provider
    return (
        <div class={styles.radioButtonGroup}>
            <Provider value={props}>{props.children}</Provider>
        </div>
    )
}

export interface RadioButtonProps {
    value: string
}

export const RadioButton: FunctionalComponent<RadioButtonProps> = props => {
    const groupProps = useContext(radioButtonContext)
    const { onInput } = groupProps ?? {}
    const input = useCallback(
        (e: Event) => {
            onInput?.(props.value, e)
        },
        [onInput, props.value],
    )
    const checked = groupProps?.value === props.value
    return (
        <label
            class={classNames(styles.radioButton, { [styles.active]: checked })}
        >
            <input
                type='radio'
                name={groupProps?.name}
                value={props.value}
                checked={checked}
                onInput={input}
            />
            {props.children}
        </label>
    )
}
