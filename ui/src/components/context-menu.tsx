import { Fragment, FunctionalComponent, h, JSX } from 'preact'
import { useLocation } from 'preact-iso'
import { useRef, useState } from 'preact/hooks'
import styles from 'src/components/context-menu.module.css'
import { Factory, SubComponentProps } from 'src/components/factory'
import { useResizeEffect } from 'src/hooks/resize-effect'
import { notNullish, truthy } from 'src/util'

export type ContextMenuItems = Array<
    [string, (() => void) | string] | undefined | null | false
>

export interface MenuProps extends SubComponentProps {
    items: ContextMenuItems
    event: MouseEvent
}

const Menu: FunctionalComponent<MenuProps> = props => {
    const loc = useLocation()
    const [listStyle, setListStyle] = useState<JSX.CSSProperties>({})
    const menu = useRef<HTMLUListElement>(null)
    useResizeEffect(() => {
        const style: JSX.CSSProperties = {}
        const box = getPosition(props.event)
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
    }, [props.event, setListStyle])
    return (
        <div onClick={props.close}>
            <div class={styles.screen} />
            <ul class={styles.menu} style={listStyle} ref={menu}>
                {props.items.filter(truthy).map(([text, action]) => {
                    if (typeof action === 'string') {
                        if (encodeURI(action) === loc.path) {
                            return <Fragment key={text + 'matching link'} />
                        }
                        return (
                            <li key={text + 'link'}>
                                <a key={text} href={action}>
                                    {text}
                                </a>
                            </li>
                        )
                    }
                    return (
                        <li key={text + 'click'} onClick={action}>
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
    e: MouseEvent,
    items: ContextMenuItems,
): Promise<void> {
    await contextMenu.open({
        items: items,
        event: e,
    })
}
export const clearContextMenus = contextMenu.clear

function getPosition(e: MouseEvent) {
    const elem = e.target as Element
    const box = elem.getBoundingClientRect()

    const body = document.body
    const docEl = document.documentElement

    const scrollTop = window.scrollY || docEl.scrollTop || body.scrollTop
    const scrollLeft = window.scrollX || docEl.scrollLeft || body.scrollLeft

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
