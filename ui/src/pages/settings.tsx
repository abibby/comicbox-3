import { FunctionalComponent, h } from 'preact'
import { route } from 'preact-router'
import { useCallback, useState } from 'preact/hooks'
import { Button, ButtonGroup } from 'src/components/button'
import { logout, userCreateToken } from '../api/auth'
import { clearDatabase } from '../database'

async function logoutAndRoute() {
    await logout()
    route('/login')
}

export const Settings: FunctionalComponent = () => {
    const [createToken, setCreateToken] = useState('')
    const generateToken = useCallback(async () => {
        const token = await userCreateToken()
        setCreateToken(token)
    }, [setCreateToken])

    const link = `${location.host}/users/create?_token=${createToken}`

    return (
        <div>
            <h1>Settings</h1>
            <ButtonGroup>
                <Button onClick={clearDatabase}>Clear Database</Button>
                <Button onClick={logoutAndRoute}>Logout</Button>
                <Button onClick={generateToken}>Invite User</Button>
            </ButtonGroup>
            <div>
                <a href={link}>{link}</a>
            </div>
        </div>
    )
}
