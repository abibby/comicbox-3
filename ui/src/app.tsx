import EventTarget from 'event-target-shim'
import { Fragment, h, render } from 'preact'
import Router from 'preact-router'
import { useRef } from 'preact/hooks'
import { AlertController, clearAlerts } from './components/alert'
import { clearContextMenus, ContextMenuController } from './components/context-menu'
import { Shell } from './components/shell'
import { Error404 } from './pages/404'
import { Home } from './pages/home'
import { Login } from './pages/login'
import { Page } from './pages/page'
import { SeriesIndex } from './pages/series-index'
import { SeriesView } from './pages/series-view'
import { Settings } from './pages/settings'
import { UserCreate } from './pages/user-create'

function changePage(): void {
    clearAlerts()
    clearContextMenus()
}

function Main() {
    useRef(new EventTarget())
    return <Fragment>
        <AlertController />
        <ContextMenuController />
        <Shell>
            <Router onChange={changePage}>
                <Home path="/" />
                <Page path="/book/:id/:page?" />
                <SeriesIndex path="/series" />
                <SeriesView path="/series/:series" />
                <Settings path="/settings" />
                <UserCreate path="/users/create" />
                <Login path="/login" />
                <Error404 default />
            </Router>
        </Shell>
    </Fragment>
} 

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<Main />, document.getElementById('app')!)
