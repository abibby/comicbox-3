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
        {props.children}
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
            <img src={props.img} />
            {props.title}
        </a>
    </li>
}

