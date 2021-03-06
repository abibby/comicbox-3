import book from 'asset-url:res/icons/book.svg'
import home from 'asset-url:res/icons/home.svg'
import list from 'asset-url:res/icons/list-check.svg'
import settings from 'asset-url:res/icons/settings.svg'
import logo from 'asset-url:res/images/logo.svg'
import { FunctionalComponent, h } from 'preact'
import 'src/variables.css'
import styles from './shell.module.css'

export const Shell: FunctionalComponent = props => {
    return (
        <div class={styles.shell}>
            <nav class={styles.nav}>
                <ul>
                    <li class={styles.logo}>
                        <a href='/'>
                            <img src={logo} alt='ComicBox' />
                        </a>
                    </li>
                    <MenuItem title='Home' img={home} link='/' />
                    <MenuItem title='Lists' img={list} link='/list' />
                    <MenuItem title='Series' img={book} link='/series' />
                    <MenuItem
                        title='Settings'
                        img={settings}
                        link='/settings'
                    />
                </ul>
                {/* <div class={styles.background} /> */}
            </nav>
            {props.children ?? <div class={styles.empty} />}
        </div>
    )
}

interface MenuItemProps {
    title: string
    img: string
    link: string
}

const MenuItem: FunctionalComponent<MenuItemProps> = props => {
    return (
        <li>
            <a href={props.link}>
                <img class={styles.icon} src={props.img} />
                <span class={styles.label}>{props.title}</span>
            </a>
        </li>
    )
}
