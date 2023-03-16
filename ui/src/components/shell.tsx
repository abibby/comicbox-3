import library from 'asset-url:res/icons/book.svg'
import home from 'asset-url:res/icons/home.svg'
import search from 'asset-url:res/icons/search.svg'
import settings from 'asset-url:res/icons/settings.svg'
import logo from 'asset-url:res/images/logo.svg'
import { FunctionalComponent, h } from 'preact'
import styles from 'src/components/shell.module.css'
import { route } from 'src/routes'
import 'src/variables.css'

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
                    <MenuItem
                        title='Home'
                        img={home}
                        link={route('home', {})}
                    />
                    <MenuItem
                        title='Search'
                        img={search}
                        link={route('search', {})}
                    />
                    <MenuItem
                        title='Library'
                        img={library}
                        link={route('library', {})}
                    />
                    <MenuItem
                        title='Settings'
                        img={settings}
                        link={route('settings', {})}
                    />
                </ul>
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
