import { FunctionalComponent, h } from 'preact'
import { Link } from 'preact-router'
import styles from './button.module.css'

type ButtonProps =
    | {
          onClick: () => void
      }
    | {
          href: string
      }

export const Button: FunctionalComponent<ButtonProps> = props => {
    if ('href' in props) {
        return (
            <Link class={styles.button} href={props.href}>
                {props.children}
            </Link>
        )
    }
    return (
        <button type='button' class={styles.button} onClick={props.onClick}>
            {props.children}
        </button>
    )
}
