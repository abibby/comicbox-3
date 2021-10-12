import EventTarget from 'event-target-shim'
import { Fragment, h, render } from 'preact'
import Router from 'preact-router'
import { useRef } from 'preact/hooks'
import { AlertController, clearAlerts } from './components/alert'
import { Shell } from './components/shell'
import { Error404 } from './pages/404'
import { Home } from './pages/home'
import { Login } from './pages/login'
import { Page } from './pages/page'
import { SeriesIndex } from './pages/series-index'
import { SeriesView } from './pages/series-view'
import { Settings } from './pages/settings'
import { UserCreate } from './pages/user-create'

function Main() {
    useRef(new EventTarget())
    return <Fragment>
        <AlertController />
        <Shell>
            <Router onChange={clearAlerts}>
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
