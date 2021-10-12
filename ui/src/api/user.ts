import { User } from "../models";
import { apiFetch } from "./internal";

export interface CreateRequest {
    username: string
    password: string
}

export async function create(req: CreateRequest): Promise<User> {
    return await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(req),
    })
}