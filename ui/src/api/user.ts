import { User } from "../models";

export interface CreateRequest {
    username: string
    password: string
}

export async function create(req: CreateRequest): Promise<User> {
    return await fetch("/api/users", {
        method: "POST",
        body: JSON.stringify(req),
    }).then(r => r.json())
}