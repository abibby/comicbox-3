import { FunctionalComponent, h, JSX } from 'preact'
import { FeatherProps } from 'preact-feather/dist/types'
import classNames from 'src/classnames'
import styles from 'src/components/button.module.css'

type ButtonProps = {
    disabled?: boolean
    color?: 'primary' | 'clear'
    class?: string
} & (
    | {
          href: string
      }
    | {
          type?: 'submit' | 'button'
          name?: string
          value?: string
          onClick?: (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => void
      }
)

export const Button: FunctionalComponent<ButtonProps> = props => {
    let colorClass: string | undefined
    if (props.color !== undefined) {
        colorClass = styles[props.color]
    }
    const className = classNames(styles.button, colorClass, props.class, {
        [styles.disabled]: props.disabled,
    })

    if ('href' in props) {
        return (
            <a class={className} href={props.href}>
                {props.children}
            </a>
        )
    }
    return (
        <button
            type={props.type ?? 'button'}
            class={className}
            onClick={props.onClick}
            name={props.name}
            value={props.value}
            disabled={props.disabled}
        >
            {props.children}
        </button>
    )
}
type IconButtonProps = ButtonProps & {
    icon: FunctionalComponent<FeatherProps>
    size?: string | number
}
export const IconButton: FunctionalComponent<IconButtonProps> = ({
    icon: Icon,
    size,
    ...props
}) => {
    if (size === undefined) {
        size = '1em'
    }
    return (
        <Button {...props}>
            <Icon class={styles.icon} width={size} height={size} />
            {props.children}
        </Button>
    )
}

export interface ButtonGroupProps {
    class?: string
    alignRight?: boolean
}

export const ButtonGroup: FunctionalComponent<ButtonGroupProps> = props => {
    return (
        <div
            class={classNames(styles.buttonGroup, props.class, {
                [styles.alignRight]: props.alignRight,
            })}
        >
            {props.children}
        </div>
    )
}
