import noImage from 'asset-url:../../res/images/no-cover.svg';
import { FunctionalComponent, h } from "preact";
import { book } from "../api";
import { useAsync } from "../hooks/async";


interface PageProps {
    matches?: {
        id: string
        page: string
    }
}

export const Page: FunctionalComponent<PageProps> = props => {
    const id = props.matches?.id ?? ''
    const page = Number(props.matches?.page || 0)

    const books = useAsync(() => book.list({id: id}), [])
    if (books.loading) {
        return <div>loading</div>
    }
    if (books.error) {
        return <div>Error {books.error.message}</div>
    }
    const image = books.result.data[0]?.pages[page]?.url ?? noImage
    return <div>
        <img src={image} alt="" />
    </div>
}