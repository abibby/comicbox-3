import { Fragment, h, render } from 'preact'
import Router from 'preact-router'
import { AlertController } from './components/alert'
import { Shell } from './components/shell'
import { Error404 } from './pages/404'
import { Home } from './pages/home'
import { Page } from './pages/page'

function Main() {
    return <Fragment>
        <AlertController />
         <Shell>
            <Router>
                <Home path="/" />
                <Page path="/book/:id/:page?" />
                <Error404 default />
            </Router>
        </Shell>
    </Fragment>
} 

render(<Main />, document.getElementById('app')!)
