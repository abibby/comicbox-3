import { h, render } from 'preact'
import { ToastController, clearToasts } from 'src/components/toast'
import {
    clearContextMenus,
    ContextMenuController,
} from 'src/components/context-menu'
import { ModalController } from 'src/components/modal-controller'
import { Shell } from 'src/components/shell'
import { Error404 } from 'src/pages/errors'
import { routes } from 'src/routes'
import { initServiceWorker } from 'src/init-service-worker'
import 'src/error'
import state from 'src/state'
import { LocationProvider, Router, Route } from 'preact-iso'
import { ChangePasswordModal } from 'src/modals/change-password-modal'
import { EditSeries } from 'src/modals/series-edit'
import { EditBook } from 'src/modals/book-edit'
import { AnilistMatch } from 'src/modals/anilist-match'

function changePage(): void {
    clearToasts()
    clearContextMenus()
}

function Main() {
    return (
        <LocationProvider>
            <ToastController />
            <ContextMenuController />
            <ModalController>
                <Router>
                    <ChangePasswordModal path='/change-password' />
                    <EditSeries path='/series/:series' />
                    <EditBook path='/book/:book' />
                    <AnilistMatch path='/anilist-match/:name' />
                </Router>
            </ModalController>
            <Shell>
                <Router onRouteChange={changePage}>
                    {Object.values(routes)
                        .map(r => (
                            <Route
                                key={r.path}
                                path={r.path}
                                component={r.component}
                            />
                        ))
                        .concat(<Error404 default />)}
                </Router>
            </Shell>
        </LocationProvider>
    )
}

state.theme.addEventListener('change', () => {
    document.documentElement.classList.remove('light')
    document.documentElement.classList.remove('dark')
    if (state.theme.value) {
        document.documentElement.classList.add(state.theme.value)
    }
})

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<Main />, document.getElementById('app')!)

initServiceWorker()

if ('virtualKeyboard' in navigator) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(navigator as any).virtualKeyboard.overlaysContent = true
}
