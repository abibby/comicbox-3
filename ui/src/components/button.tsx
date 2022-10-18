import { FunctionalComponent, h } from 'preact'
import { Link } from 'preact-router'
import classNames from 'src/classnames'
import styles from 'src/components/button.module.css'

type ButtonProps = {
    disabled?: boolean
    color?: 'primary'
} & (
    | {
          href: string
      }
    | {
          type?: 'submit' | 'button'
          name?: string
          value?: string
          onClick?: () => void
      }
)

export const Button: FunctionalComponent<ButtonProps> = props => {
    let colorClass: string | undefined
    if (props.color !== undefined) {
        colorClass = styles[props.color]
    }
    if ('href' in props) {
        return (
            <Link
                class={classNames(styles.button, colorClass, {
                    [styles.disabled]: props.disabled,
                })}
                href={props.href}
            >
                {props.children}
            </Link>
        )
    }
    return (
        <button
            type={props.type ?? 'button'}
            class={classNames(styles.button, colorClass, {
                [styles.disabled]: props.disabled,
            })}
            onClick={props.onClick}
            name={props.name}
            value={props.value}
            disabled={props.disabled}
        >
            {props.children}
        </button>
    )
}

export const ButtonGroup: FunctionalComponent = props => {
    return <div class={styles.buttonGroup}>{props.children}</div>
}
