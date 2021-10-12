import { bindValue } from "@zwzn/spicy";
import { FunctionalComponent, h } from "preact";
import { useCallback, useState } from "preact/hooks";
import { user } from "../api";

export const UserCreate: FunctionalComponent = () => {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const submit = useCallback(async (e: Event) => {
        e.preventDefault()
        await user.create({
            username: username,
            password: password
        })
    }, [username, password])

    return <div>
        <h1>Create User</h1>
        <form onSubmit={submit}>
            <input type="text" value={username} onInput={bindValue(setUsername)} />
            <input type="text" value={password} onInput={bindValue(setPassword)} />
            <button type="submit">Create</button>
        </form>
    </div>
}