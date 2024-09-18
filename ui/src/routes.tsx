import slog from 'src/slog'
import { Error500 } from 'src/pages/errors'
import { AnyComponent, h } from 'preact'
import { lazy } from 'preact-iso'

function handleError(err: unknown): AnyComponent {
    slog.Error('failed to import page', { err: err })
    // eslint-disable-next-line react/display-name
    return () => <Error500 error={err} />
}
function lazyPage<T extends AnyComponent>(
    load: () => Promise<{ default: T } | T>,
): AnyComponent {
    return lazy(() => load().catch(handleError))
}

export const routes = {
    home: {
        path: '/',
        component: lazyPage(() => import('./pages/home').then(p => p.Home)),
    },
    'book.view': {
        path: '/book/:id/:page?',
        component: lazyPage(() =>
            import('./pages/book-view').then(p => p.BookView),
        ),
    },
    list: {
        path: '/list/:list',
        component: lazyPage(() => import('./pages/lists').then(p => p.List)),
    },
    search: {
        path: '/search',
        component: lazyPage(() => import('./pages/search').then(p => p.Search)),
    },
    library: {
        path: '/library',
        component: lazyPage(() =>
            import('./pages/library').then(p => p.Library),
        ),
    },
    'series.index': {
        path: '/series',
        component: lazyPage(() =>
            import('./pages/series-index').then(p => p.SeriesIndex),
        ),
    },
    'series.view': {
        path: '/series/:series',
        component: lazyPage(() =>
            import('./pages/series-view').then(p => p.SeriesView),
        ),
    },
    settings: {
        path: '/settings',
        component: lazyPage(() =>
            import('./pages/settings').then(p => p.Settings),
        ),
    },
    'user.create': {
        path: '/users/create',
        component: lazyPage(() =>
            import('./pages/user-create').then(p => p.UserCreate),
        ),
    },
    'anilist.login': {
        path: '/anilist/login',
        component: lazyPage(() =>
            import('./pages/anilist-login').then(p => p.AnilistLogin),
        ),
    },
    login: {
        path: '/login',
        component: lazyPage(() => import('./pages/login').then(p => p.Login)),
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

type Routes = typeof routes

type RouteName = keyof Routes

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
