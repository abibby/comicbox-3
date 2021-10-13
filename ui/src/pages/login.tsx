import { FunctionalComponent, h } from "preact";
import { route } from "preact-router";
import { useCallback } from "preact/hooks";
import { auth } from "../api";
import { Form } from "../components/form/form";

export const Login: FunctionalComponent = () => {
    const submit = useCallback(async (data: Map<string, string>) => {
        await auth.login({
            username: data.get('username') ?? "",
            password: data.get('password') ?? "",
        })

        route('/')
    }, [])

    return <div>
        <h1>Create User</h1>
        <Form onSubmit={submit}>
            <input type="text" name="username"/>
            <input type="text" name="password"/>
            <button type="submit">Login</button>
        </Form>
    </div>
}