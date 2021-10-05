import book from "asset-url:../../res/icons/book.svg";
import home from "asset-url:../../res/icons/home.svg";
import list from "asset-url:../../res/icons/list-check.svg";
import search from "asset-url:../../res/icons/search.svg";
import { FunctionalComponent, h } from "preact";
import styles from "./shell.module.css";

export const Shell: FunctionalComponent = props => {
    return <div class={styles.shell}>
        <nav class={styles.nav}>
            <ul>
                <li class={styles.logo}>
                    <a href="/">
                        <img src="https://comic.adambibby.ca/icon_96x96.bf66d23aff58118f339581cffe09832a.png" />
                    </a>
                </li>
                <MenuItem
                    title="Home"
                    img={home}
                    link="/"
                />
                <MenuItem
                    title="Lists"
                    img={list}
                    link="/list"
                />
                <MenuItem
                    title="Series"
                    img={book}
                    link="/series"
                />
                <MenuItem
                    title="Search"
                    img={search}
                    link="/search"
                />
            </ul>
        </nav>
        {props.children ?? <div class={styles.empty}></div>}
    </div>
}

interface MenuItemProps {
    title: string
    img: string
    link: string
}

const MenuItem: FunctionalComponent<MenuItemProps> = props => {
    return <li>
        <a href={props.link}>
            <img class={styles.icon} src={props.img} />
            <span class={styles.label}>{props.title}</span>
        </a>
    </li>
}

