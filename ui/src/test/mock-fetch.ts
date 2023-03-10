export function mockFetch<T>(
    server: (url: URL, info: RequestInit | undefined) => T,
): void {
    globalThis.fetch = async (input, info) => {
        let url: URL
        if (input instanceof URL) {
            url = input
            // } else if (input instanceof Request) {
            //     url = new URL(input.url)
        } else {
            url = new URL(input as string, 'https://localhost')
        }
        const body = server(url, info)
        const response: Partial<Response> = {
            json: () => Promise.resolve(body),
            text: () => Promise.resolve(JSON.stringify(body)),
            ok: true,
            status: 200,
            statusText: 'ok',
        }
        return response as Response
    }
}
