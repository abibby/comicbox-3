import { useEffect, useState } from 'preact/hooks'

export function useMediaQuery(query: string): boolean {
    const getMatches = (query: string): boolean => {
        // Prevents SSR issues
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches
        }
        return false
    }

    const [matches, setMatches] = useState<boolean>(getMatches(query))

    function handleChange(event: MediaQueryListEvent) {
        setMatches(event.matches)
    }

    useEffect(() => {
        const matchMedia = window.matchMedia(query)

        setMatches(getMatches(query))

        matchMedia.addEventListener('change', handleChange)

        return () => {
            matchMedia.removeEventListener('change', handleChange)
        }
    }, [query])

    return matches
}
