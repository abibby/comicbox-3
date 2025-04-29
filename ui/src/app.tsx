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
import { LocationProvider, Router, Route } from 'preact-iso'
import { ChangePasswordModal } from 'src/modals/change-password-modal'
import { EditSeries } from 'src/modals/series-edit'
import { EditBook } from 'src/modals/book-edit'
import { MetadataMatch } from 'src/modals/metadata-match'
import { ErrorBoundary } from 'src/components/error-boundry'

function changePage(): void {
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

function ShellPages() {
    return (
        <Shell>
            <Router>
                {shellRoutes.map(r => (
                    <Route key={r.path} path={r.path} component={r.component} />
                ))}
                <Route default component={Error404} />
            </Router>
        </Shell>
    )
}

function Main() {
    return (
        <LocationProvider>
            <ErrorBoundary>
                <Router onRouteChange={changePage}>
                    {nonShellRoutes.map(r => (
                        <Route
                            key={r.path}
                            path={r.path}
                            component={r.component}
                        />
                    ))}
                    <Route path='/' component={ShellPages} />
                    <Route path='/*' component={ShellPages} />
                </Router>
                <ToastController />
                <ContextMenuController />
                <ModalController>
                    <Router>
                        <Route
                            path='/change-password'
                            component={ChangePasswordModal}
                        />
                        <Route path='/series/:series' component={EditSeries} />
                        <Route path='/book/:book' component={EditBook} />
                        <Route path='/book/:book/*' component={EditBook} />
                        <Route
                            path='/metadata/:slug'
                            component={MetadataMatch}
                        />
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
