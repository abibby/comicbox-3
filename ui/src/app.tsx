import EventTarget from 'event-target-shim'
import serviceWorkerURL from 'omt:./service-worker.ts'
import { Fragment, h, render } from 'preact'
import Router from 'preact-router'
import { useRef } from 'preact/hooks'
import { AlertController, clearAlerts } from './components/alert'
import {
    clearContextMenus,
    ContextMenuController,
} from './components/context-menu'
import { clearModals, ModalController } from './components/modal'
import { Shell } from './components/shell'
import { setSW } from './message'
import { Error404 } from './pages/404'
import { Home } from './pages/home'
import { List } from './pages/lists'
import { Login } from './pages/login'
import { Page } from './pages/page'
import { SeriesIndex } from './pages/series-index'
import { SeriesView } from './pages/series-view'
import { Settings } from './pages/settings'
import { UserCreate } from './pages/user-create'

function changePage(): void {
    clearAlerts()
    clearContextMenus()
    clearModals()
}

function Main() {
    useRef(new EventTarget())
    return (
        <Fragment>
            <AlertController />
            <ContextMenuController />
            <ModalController />
            <Shell>
                <Router onChange={changePage}>
                    <Home path='/' />
                    <Page path='/book/:id/:page?' />
                    <List path='/list' />
                    <SeriesIndex path='/series' />
                    <SeriesView path='/series/:series' />
                    <Settings path='/settings' />
                    <UserCreate path='/users/create' />
                    <Login path='/login' />
                    <Error404 default />
                </Router>
            </Shell>
        </Fragment>
    )
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<Main />, document.getElementById('app')!)

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register(serviceWorkerURL, { scope: '/', type: 'module' })
        .then(reg => {
            console.warn(reg)
            setSW(reg)
        })
        .catch(err => {
            console.error(err)
        })
}
