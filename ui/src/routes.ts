import { Home } from 'src/pages/home'
import { BookView } from 'src/pages/book-view'
import { Profile } from 'src/pages/profile'
import { SeriesIndex } from 'src/pages/series-index'
import { SeriesView } from 'src/pages/series-view'
import { UserCreate } from 'src/pages/user-create'
import { AnilistLogin } from 'src/pages/anilist-login'
import { Login } from 'src/pages/login'
import { List } from 'src/pages/lists'
import { Search } from 'src/pages/search'
import { Settings } from 'src/pages/settings'

export const routes = {
    home: {
        path: '/',
        component: Home,
    },
    'book.view': {
        path: '/book/:id/:page?',
        component: BookView,
        noshell: true,
    },
    list: {
        path: '/list/:list',
        component: List,
    },
    search: {
        path: '/search',
        component: Search,
    },
    library: {
        path: '/profile',
        component: Profile,
    },
    'series.index': {
        path: '/series',
        component: SeriesIndex,
    },
    'series.view': {
        path: '/series/:series',
        component: SeriesView,
    },
    settings: {
        path: '/settings',
        component: Settings,
    },
    'user.create': {
        path: '/users/create',
        component: UserCreate,
    },
    'anilist.login': {
        path: '/anilist/login',
        component: AnilistLogin,
    },
    login: {
        path: '/login',
        noshell: true,
        component: Login,
    },
} as const

type RouteParts<
    T extends string,
    O = never,
> = T extends `/${infer First}/${infer Rest}`
    ? RouteParts<`/${Rest}`, O | First>
    : T extends `/${infer First}`
    ? O | First
    : O

type OptionalArg<T extends string> = T extends `:${infer Key}?` ? Key : never
type RequiredArg<T extends string> = T extends `:${infer _Key}?`
    ? never
    : T extends `:${infer Key}`
    ? Key
    : never

type RouteParams<T extends string> = {
    [P in RequiredArg<RouteParts<T>>]: string | number
} & {
    [P in OptionalArg<RouteParts<T>>]?: string | number
}

export type Routes = typeof routes
export type RouteName = keyof Routes
export type Route = Routes[RouteName]

type RouteArgs<T extends RouteName> = keyof RouteParams<
    Routes[T]['path']
> extends never
    ? [name: T, params?: RouteParams<Routes[T]['path']>]
    : [name: T, params: RouteParams<Routes[T]['path']>]

export function route<T extends RouteName>(...args: RouteArgs<T>): string
export function route<T extends RouteName>(
    name: T,
    args?: RouteParams<Routes[T]['path']>,
): string {
    const route = routes[name]
    let path: string = route.path
    for (const [key, value] of Object.entries(args ?? {})) {
        path = path.replace(`:${key}`, encodeURIComponent(String(value)))
    }
    path = path.replace(/\/:[^/]+\?/, '')
    return path
}
