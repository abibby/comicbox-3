import { FunctionalComponent, h } from 'preact'
import { route as preactRoute } from 'preact-router'
import { useEffect } from 'preact/hooks'
import { anilist } from 'src/api'
import { route } from 'src/routes'

export interface AnilistLoginProps {
    code?: string
}

export const AnilistLogin: FunctionalComponent<AnilistLoginProps> = props => {
    const code = props.code
    useEffect(() => {
        if (code === undefined) {
            return
        }
        anilist
            .login({
                grant: code,
            })
            .then(() => preactRoute(route('settings', {})))
    }, [code])
    return <div />
}
