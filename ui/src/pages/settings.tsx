import { FunctionalComponent, h } from 'preact'
import { route as preactRoute } from 'preact-router'
import { useCallback, useState } from 'preact/hooks'
import { logout, userCreateToken } from 'src/api/auth'
import { prompt } from 'src/components/alert'
import { Button, ButtonGroup } from 'src/components/button'
import { clearDatabase } from 'src/database'

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

    const redirectURI = location.origin + '/anilist/login'

    /*
     settings

     start scan
     generate user create link
     clear database     
     logout
     anilist login

     */

    return (
        <div>
            <h1>Settings</h1>
            <ButtonGroup>
                <Button onClick={clearDatabase}>Clear Database</Button>
                <Button onClick={logoutAndRoute}>Logout</Button>
            </ButtonGroup>

            {!PUBLIC_USER_CREATE && (
                <div>
                    <Button onClick={generateToken}>Invite User</Button>
                    <a href={link}>{link}</a>
                </div>
            )}
            <section>
                <h1>Anilist</h1>
                <a
                    href={`https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&redirect_uri=${encodeURIComponent(
                        redirectURI,
                    )}&response_type=code`}
                >
                    Login with AniList
                </a>
            </section>
        </div>
    )
}
