import { Fragment, h, render } from 'preact'
import Router from 'preact-router'
import { AlertController } from './components/alert'
import { Shell } from './components/shell'
import { Error404 } from './pages/404'
import { Home } from './pages/home'
import { Page } from './pages/page'
import { SeriesIndex } from './pages/series-index'
import { SeriesView } from './pages/series-view'
import { Settings } from './pages/settings'

function Main() {
    return <Fragment>
        <AlertController />
         <Shell>
            <Router>
                <Home path="/" />
                <Page path="/book/:id/:page?" />
                <SeriesIndex path="/series" />
                <SeriesView path="/series/:series" />
                <Settings path="/settings" />
                <Error404 default />
            </Router>
        </Shell>
    </Fragment>
} 

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<Main />, document.getElementById('app')!)
