import { FunctionalComponent, h } from 'preact'
import { route } from 'preact-router'
import { Button, ButtonGroup } from 'src/components/button'
import { logout } from '../api/auth'
import { clearDatabase } from '../database'

async function logoutAndRoute() {
    await logout()
    route('/login')
}

export const Settings: FunctionalComponent = () => {
    return (
        <div>
            <h1>Settings</h1>
            <ButtonGroup>
                <Button onClick={clearDatabase}>Clear Database</Button>
                <Button onClick={logoutAndRoute}>Logout</Button>
            </ButtonGroup>
        </div>
    )
}
