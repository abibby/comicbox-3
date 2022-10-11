import { FunctionalComponent, h, JSX } from 'preact'
import { Link } from 'preact-router'
import { useRef, useState } from 'preact/hooks'
import styles from 'src/components/context-menu.module.css'
import { Factory, SubComponentProps } from 'src/components/factory'
import { useResizeEffect } from 'src/hooks/resize-effect'

export type ContextMenuItems = Array<[string, (() => void) | string]>

export interface MenuProps extends SubComponentProps {
    items: ContextMenuItems
    target: Element
}

const Menu: FunctionalComponent<MenuProps> = props => {
    const [listStyle, setListStyle] = useState<JSX.CSSProperties>({})
    const menu = useRef<HTMLUListElement>(null)
    useResizeEffect(() => {
        const style: JSX.CSSProperties = {}
        const box = getPosition(props.target)
        const menuWidth = menu.current?.clientWidth ?? 0
        const menuHeight = menu.current?.clientHeight ?? 0

        if (box.left + menuWidth < window.innerWidth) {
            style.left = box.left
        } else {
            style.right = 0
        }
        if (
            box.top + menuHeight <
            document.body.getBoundingClientRect().height
        ) {
            style.top = box.top + box.height
        } else {
            style.top = box.top - menuHeight
        }
        setListStyle(style)
    }, [props.target, setListStyle])
    return (
        <div onClick={props.close}>
            <div class={styles.screen} />
            <ul class={styles.menu} style={listStyle} ref={menu}>
                {props.items.map(([text, action]) => {
                    if (typeof action === 'string') {
                        if (encodeURI(action) === location.pathname) {
                            return <li key={text}>{text}</li>
                        }
                        return (
                            <li>
                                <Link key={text} href={action}>
                                    {text}
                                </Link>
                            </li>
                        )
                    }
                    return (
                        <li key={text} onClick={action}>
                            {text}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

const contextMenu = new Factory(Menu)

export const ContextMenuController = contextMenu.Controller

export async function openContextMenu(
    target: EventTarget | null,
    items: ContextMenuItems,
): Promise<void> {
    await contextMenu.open({
        items: items,
        target: target as Element,
    })
}
export const clearContextMenus = contextMenu.clear

function getPosition(elem: Element) {
    const box = elem.getBoundingClientRect()

    const body = document.body
    const docEl = document.documentElement

    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop
    const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft

    const clientTop = docEl.clientTop || body.clientTop || 0
    const clientLeft = docEl.clientLeft || body.clientLeft || 0

    const top = box.top + scrollTop - clientTop
    const left = box.left + scrollLeft - clientLeft

    return {
        top: Math.round(top),
        left: Math.round(left),
        height: box.height,
    }
}
