import { FunctionalComponent, h } from "preact";
import { logout } from "../api/auth";
import { clearDatabase } from "../database";

export const Settings: FunctionalComponent = () => {
    return <div>
        <h1>Settings</h1>
        <button onClick={clearDatabase}>Clear Database</button>
        <button onClick={logout}>Logout</button>
    </div>
}