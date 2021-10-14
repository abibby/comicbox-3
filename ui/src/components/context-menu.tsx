import { FunctionalComponent, h } from "preact";
import { Link } from "preact-router";
import { useCallback, useState } from "preact/hooks";
import classNames from "../classnames";
import styles from "./context-menu.module.css";

export type ContextMenuItems = Array<[string, (() => void) | string]>

export interface ContextMenuProps {
    items: ContextMenuItems
}

export const ContextMenu: FunctionalComponent<ContextMenuProps> = props => {
    const [open, setOpen] = useState(false)
    const click = useCallback((e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        setOpen(true)
    }, [setOpen])

    const close = useCallback((e: Event): void => {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
    }, [setOpen])
    return <div class={classNames(styles.menu, {[styles.open]: open})}>
        <button onClick={click}>open</button>
        <ul class={styles.list} onClick={close}>
            {props.items.map(([text, action]) => {
                if (typeof action === 'string') {
                    if (encodeURI(action) === location.pathname) {
                        return <li>{text}</li>
                    }
                    return <li><Link href={action}>{text}</Link></li>
                }
                return <li onClick={action}>{text}</li>
            })}
        </ul>
    </div>
}
