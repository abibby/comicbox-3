import { bindValue } from '@zwzn/spicy'
import { ComponentChildren, FunctionalComponent, h, JSX } from 'preact'
import { FeatherProps } from 'preact-feather/dist/types'
import classNames, { Argument } from 'src/classnames'
import styles from 'src/components/button.module.css'

type CommonButtonProps = Partial<ButtonIconProps> & {
    disabled?: boolean
    color?: 'primary' | 'clear'
    class?: string
}

type LinkButtonProps = CommonButtonProps & {
    href: string
}
type FormButtonProps = CommonButtonProps & {
    type?: 'submit' | 'button'
    name?: string
    value?: string
    onClick?: (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => void
}

type ButtonProps = LinkButtonProps | FormButtonProps

export const Button: FunctionalComponent<ButtonProps> = ({ ...props }) => {
    const className = buttonClassNames(props)

    const iconElement = props.icon && (
        <ButtonIcon icon={props.icon} {...props} />
    )
    if ('href' in props) {
        return (
            <a class={className} href={props.href}>
                {iconElement}
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
            {iconElement}
            {props.children}
        </button>
    )
}
type ButtonIconProps = {
    icon: FunctionalComponent<FeatherProps>
    iconSize?: string | number
    iconFilled?: boolean
    children?: ComponentChildren
}
function ButtonIcon({
    icon: Icon,
    iconSize,
    iconFilled,
    children,
}: ButtonIconProps) {
    if (iconSize === undefined) {
        iconSize = '1em'
    }
    return (
        <Icon
            class={classNames(styles.icon, {
                [styles.iconOnly]: !children,
            })}
            width={iconSize}
            height={iconSize}
            fill={iconFilled ? 'currentColor' : 'none'}
        />
    )
}

function buttonClassNames(props: ButtonProps, ...args: Argument[]): string {
    let colorClass: string | undefined
    if (props.color !== undefined) {
        colorClass = styles[props.color]
    }
    return classNames(
        styles.button,
        colorClass,
        props.class,
        {
            [styles.disabled]: props.disabled,
        },
        ...args,
    )
}

type SelectButtonProps = Omit<FormButtonProps, 'onClick'> & {
    options: readonly (readonly [string, string])[]
    onChange: (s: string, e: Event) => void
}
export const SelectButton: FunctionalComponent<SelectButtonProps> = ({
    options,
    onChange,
    ...props
}) => {
    return (
        <label class={buttonClassNames(props, styles.selectLabel)}>
            {props.icon && <ButtonIcon icon={props.icon} {...props} />}
            <select class={styles.select} onInput={bindValue(onChange)}>
                {options.map(opt => (
                    <option value={opt[0]} key={opt[0]}>
                        {opt[1]}
                    </option>
                ))}
            </select>
        </label>
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
