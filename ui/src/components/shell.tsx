import logo from 'res/images/logo.svg'
import { FunctionalComponent, h } from 'preact'
import styles from 'src/components/shell.module.css'
import { route } from 'src/routes'
import { Book, Home, Search, Settings, User } from 'preact-feather'
import 'src/variables.css'
import { FeatherProps } from 'preact-feather/dist/types'

export const Shell: FunctionalComponent = props => {
    return (
        <div class={styles.shell}>
            <nav class={styles.nav}>
                <ul>
                    <li class={styles.logo}>
                        <a href={route('home')}>
                            <img src={logo} alt='ComicBox' />
                        </a>
                    </li>
                    <MenuItem title='Home' icon={Home} link={route('home')} />
                    <MenuItem
                        title='Search'
                        icon={Search}
                        link={route('search')}
                    />
                    <MenuItem
                        title='Profile'
                        icon={User}
                        link={route('library')}
                    />
                    <MenuItem
                        title='Settings'
                        class={styles.settings}
                        icon={Settings}
                        link={route('settings')}
                    />
                </ul>
            </nav>
            {props.children}
        </div>
    )
}

interface MenuItemProps {
    title: string
    icon: FunctionalComponent<FeatherProps>
    link: string
    class?: string
}

const MenuItem: FunctionalComponent<MenuItemProps> = props => {
    const Icon = props.icon
    return (
        <li class={props.class}>
            <a href={props.link}>
                <Icon class={styles.icon} />
                <span class={styles.label}>{props.title}</span>
            </a>
        </li>
    )
}
