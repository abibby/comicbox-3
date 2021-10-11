import { FunctionalComponent, h } from "preact";
import { BookList } from "../components/book-list";

interface SeriesViewProps {
    matches?: {
        series: string
    }
}

export const SeriesView: FunctionalComponent<SeriesViewProps> = props => {
    return <div>
        <h1>{props.matches?.series}</h1>
        <BookList listName="books" series={props.matches?.series} />
    </div>
}