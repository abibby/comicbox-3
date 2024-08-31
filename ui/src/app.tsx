import EventTarget from 'event-target-shim'
import { Fragment, h, render } from 'preact'
import AsyncRoute from 'preact-async-route'
import Router from 'preact-router'
import { useRef } from 'preact/hooks'
import { ToastController, clearToasts } from 'src/components/toast'
import {
    clearContextMenus,
    ContextMenuController,
} from 'src/components/context-menu'
import { clearModals, ModalController } from 'src/components/modal'
import { Shell } from 'src/components/shell'
import { Error404 } from 'src/pages/errors'
import { routes } from 'src/routes'
import { initServiceWorker } from 'src/init-service-worker'
import 'src/error'

function changePage(): void {
    clearToasts()
    clearContextMenus()
    clearModals()
}

function Main() {
    useRef(new EventTarget())
    return (
        <Fragment>
            <ToastController />
            <ContextMenuController />
            <ModalController />
            <Shell>
                <Router onChange={changePage}>
                    {Object.values(routes).map(r => {
                        return (
                            <AsyncRoute
                                key={r.path}
                                path={r.path}
                                getComponent={r.component}
                            />
                        )
                    })}
                    <Error404 default />
                </Router>
            </Shell>
        </Fragment>
    )
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<Main />, document.getElementById('app')!)

initServiceWorker()

if ('virtualKeyboard' in navigator) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(navigator as any).virtualKeyboard.overlaysContent = true
}
