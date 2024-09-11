import { FunctionalComponent, h } from 'preact'
import { useLocation } from 'preact-iso'
import { useEffect, useState } from 'preact/hooks'
import { anilist } from 'src/api'
import { route } from 'src/routes'

export interface AnilistLoginProps {
    code?: string
}

export const AnilistLogin: FunctionalComponent<AnilistLoginProps> = props => {
    const { route: navigate } = useLocation()
    const [err, setErr] = useState<string>()
    const code = props.code
    useEffect(() => {
        if (code === undefined) {
            return
        }
        anilist
            .login({
                grant: code,
            })
            .then(() => navigate(route('settings', {})))
            .catch(err => {
                if (err instanceof Error) {
                    setErr(err.message)
                } else {
                    setErr('unknown error')
                }
            })
    }, [code, navigate])
    return <div>{err}</div>
}
