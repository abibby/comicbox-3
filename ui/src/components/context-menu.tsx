import { FunctionalComponent, h } from "preact";
import { Link } from "preact-router";
import styles from "./context-menu.module.css";
import { Factory, SubComponentProps } from "./factory";

export type ContextMenuItems = Array<[string, (() => void) | string]>

export interface MenuProps extends SubComponentProps {
    items: ContextMenuItems
    top: number
    left: number
}

const Menu: FunctionalComponent<MenuProps> = props => {
    return <div onClick={props.close}>
        <div class={styles.screen} />
        <ul class={styles.menu} style={{ top: props.top, left: props.left }}>
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

const contextMenu = new Factory(Menu)

export const ContextMenuController = contextMenu.Controller

function getPosition(elem: Element) {
    const box = elem.getBoundingClientRect();

    const body = document.body;
    const docEl = document.documentElement;

    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    const clientTop = docEl.clientTop || body.clientTop || 0;
    const clientLeft = docEl.clientLeft || body.clientLeft || 0;

    const top  = box.top +  scrollTop - clientTop;
    const left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
}

export async function openContextMenu(target: EventTarget | null, items: ContextMenuItems): Promise<void> {
    const btn = target as HTMLElement

    await contextMenu.open({
        items: items,
        ...getPosition(btn),
    })
}
export const clearContextMenus = contextMenu.clear