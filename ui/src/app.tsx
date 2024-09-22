import { h, render } from 'preact'
import { ToastController, clearToasts } from 'src/components/toast'
import {
    clearContextMenus,
    ContextMenuController,
} from 'src/components/context-menu'
import { ModalController } from 'src/components/modal-controller'
import { Shell } from 'src/components/shell'
import { Error404 } from 'src/pages/errors'
import { Route as RouteDef, routes } from 'src/routes'
import { initServiceWorker } from 'src/init-service-worker'
import 'src/error'
import state from 'src/state'
import { LocationProvider, Router, Route, ErrorBoundary } from 'preact-iso'
import { ChangePasswordModal } from 'src/modals/change-password-modal'
import { EditSeries } from 'src/modals/series-edit'
import { EditBook } from 'src/modals/book-edit'
import { AnilistMatch } from 'src/modals/anilist-match'

function changePage(): void {
    console.log('changePath', arguments)

    clearToasts()
    clearContextMenus()
}

function hideShell(route: RouteDef): boolean {
    return 'noshell' in route && route.noshell
}
function showShell(route: RouteDef): boolean {
    return !hideShell(route)
}

const routeList = Object.values(routes)
const nonShellRoutes = routeList.filter(hideShell)
const shellRoutes = routeList.filter(showShell)
const indexRoute = routeList.find(r => r.path === '/')

function Main() {
    const IndexComponent = indexRoute?.component ?? Error404

    return (
        <LocationProvider>
            <ErrorBoundary>
                <Router onRouteChange={changePage}>
                    {nonShellRoutes
                        .map(r => (
                            <Route
                                key={r.path}
                                path={r.path}
                                component={r.component}
                            />
                        ))
                        .concat(
                            <Shell path='/'>
                                <IndexComponent />
                            </Shell>,
                            <Shell path='/*'>
                                <Router>
                                    {shellRoutes
                                        .map(r => (
                                            <Route
                                                key={r.path}
                                                path={r.path}
                                                component={r.component}
                                            />
                                        ))
                                        .concat(<Error404 default />)}
                                </Router>
                            </Shell>,
                        )}
                </Router>
                <ToastController />
                <ContextMenuController />
                <ModalController>
                    <Router>
                        <ChangePasswordModal path='/change-password' />
                        <EditSeries path='/series/:series' />
                        <EditBook path='/book/:book' />
                        <EditBook path='/book/:book/*' />
                        <AnilistMatch path='/anilist-match/:name' />
                    </Router>
                </ModalController>
            </ErrorBoundary>
        </LocationProvider>
    )
}

state.theme.subscribe(theme => {
    document.documentElement.classList.remove('light')
    document.documentElement.classList.remove('dark')
    if (theme) {
        document.documentElement.classList.add(theme)
    }
})

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<Main />, document.getElementById('app')!)

initServiceWorker()

if ('virtualKeyboard' in navigator) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(navigator as any).virtualKeyboard.overlaysContent = true
}
