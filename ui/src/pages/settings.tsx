import { FunctionalComponent, h } from 'preact'
import { route as preactRoute } from 'preact-router'
import { useCallback, useState } from 'preact/hooks'
import { prompt } from 'src/components/alert'
import { Button, ButtonGroup } from 'src/components/button'
import { anilist } from '../api'
import { logout, userCreateToken } from '../api/auth'
import { clearDatabase } from '../database'

async function logoutAndRoute() {
    const accepted = await prompt(
        'Logging out will remove all local storage. Are you sure?',
        {
            yes: true,
            no: false,
        },
    )
    if (accepted) {
        await logout()
        preactRoute('/login')
    }
}

export const Settings: FunctionalComponent = () => {
    const [createToken, setCreateToken] = useState('')
    const generateToken = useCallback(async () => {
        const token = await userCreateToken()
        setCreateToken(token)
    }, [setCreateToken])

    const link = `${location.host}/users/create?_token=${createToken}`

    const clientID = 8195
    const redirectURI = location.origin + '/anilist/login'

    return (
        <div>
            <h1>Settings</h1>
            <ButtonGroup>
                <Button onClick={clearDatabase}>Clear Database</Button>
                <Button onClick={logoutAndRoute}>Logout</Button>
                <Button onClick={generateToken}>Invite User</Button>
                <Button onClick={anilist.updateManga}>Anilist Update</Button>
            </ButtonGroup>
            <div>
                <a href={link}>{link}</a>
            </div>
            <section>
                <h1>Anilist</h1>
                <a
                    href={`https://anilist.co/api/v2/oauth/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(
                        redirectURI,
                    )}&response_type=code`}
                >
                    Login with AniList
                </a>
            </section>
        </div>
    )
}
