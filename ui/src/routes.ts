function handleError() {
    location.reload()
}

export const routes = {
    home: {
        path: '/',
        component: () =>
            import('./pages/home').then(p => p.Home).catch(handleError),
    },
    'book.view': {
        path: '/book/:id/:page?',
        component: () =>
            import('./pages/book-view')
                .then(p => p.BookView)
                .catch(handleError),
    },
    list: {
        path: '/list',
        component: () =>
            import('./pages/lists').then(p => p.List).catch(handleError),
    },
    'series.index': {
        path: '/series',
        component: () =>
            import('./pages/series-index')
                .then(p => p.SeriesIndex)
                .catch(handleError),
    },
    'series.view': {
        path: '/series/:series',
        component: () =>
            import('./pages/series-view')
                .then(p => p.SeriesView)
                .catch(handleError),
    },
    settings: {
        path: '/settings',
        component: () =>
            import('./pages/settings').then(p => p.Settings).catch(handleError),
    },
    'user.create': {
        path: '/users/create',
        component: () =>
            import('./pages/user-create')
                .then(p => p.UserCreate)
                .catch(handleError),
    },
    'anilist.login': {
        path: '/anilist/login',
        component: () =>
            import('./pages/anilist-login')
                .then(p => p.AnilistLogin)
                .catch(handleError),
    },
    login: {
        path: '/login',
        component: () =>
            import('./pages/login').then(p => p.Login).catch(handleError),
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

type RouteArgs<T extends string> = {
    [P in RequiredArg<RouteParts<T>>]: string | number
} & {
    [P in OptionalArg<RouteParts<T>>]?: string | number
}

export function route<T extends keyof typeof routes>(
    name: T,
    args: RouteArgs<typeof routes[T]['path']>,
): string {
    const route = routes[name]
    let path: string = route.path
    for (const [key, value] of Object.entries(args)) {
        path = path.replace(`:${key}`, encodeURIComponent(String(value)))
    }
    path = path.replace(/\/:[^/]+\?/, '')
    return path
}
