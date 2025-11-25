import { Home } from 'src/pages/home'
import { lazy } from 'preact-iso'

export const routes = {
    home: {
        path: '/',
        component: Home,
    },
    'book.view': {
        path: '/book/:id/:page?',
        component: lazy(() =>
            import('src/pages/book-view').then(m => m.BookView),
        ),
        noshell: true,
    },
    list: {
        path: '/list/:list',
        component: lazy(() => import('src/pages/lists').then(m => m.List)),
    },
    search: {
        path: '/search',
        component: lazy(() => import('src/pages/search').then(m => m.Search)),
    },
    library: {
        path: '/profile',
        component: lazy(() => import('src/pages/profile').then(m => m.Profile)),
    },
    'series.index': {
        path: '/series',
        component: lazy(() =>
            import('src/pages/series-index').then(m => m.SeriesIndex),
        ),
    },
    'series.view': {
        path: '/series/:series',
        component: lazy(() =>
            import('src/pages/series-view').then(m => m.SeriesView),
        ),
    },
    settings: {
        path: '/settings',
        component: lazy(() =>
            import('src/pages/settings').then(m => m.Settings),
        ),
    },
    'user.create': {
        path: '/users/create',
        component: lazy(() =>
            import('src/pages/user-create').then(m => m.UserCreate),
        ),
    },
    'anilist.login': {
        path: '/anilist/login',
        component: lazy(() =>
            import('src/pages/anilist-login').then(m => m.AnilistLogin),
        ),
    },
    login: {
        path: '/login',
        noshell: true,
        component: lazy(() => import('src/pages/login').then(m => m.Login)),
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
