import { bindValue } from "@zwzn/spicy";
import { FunctionalComponent, h } from "preact";
import { route } from "preact-router";
import { useCallback, useState } from "preact/hooks";
import { auth } from "../api";

export const Login: FunctionalComponent = () => {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const submit = useCallback(async (e: Event) => {
        e.preventDefault()
        await auth.login({
            username: username,
            password: password
        })

        route('/')
    }, [username, password])

    return <div>
        <h1>Create User</h1>
        <form onSubmit={submit}>
            <input type="text" value={username} onInput={bindValue(setUsername)} />
            <input type="text" value={password} onInput={bindValue(setPassword)} />
            <button type="submit">Login</button>
        </form>
    </div>
}