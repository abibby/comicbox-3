import { FunctionalComponent, h } from "preact";
import { series } from "../api";
import { BookList } from "../components/book-list";
import { DB } from "../database";
import { useCached } from "../hooks/cached";
import { Error404 } from "./404";

interface SeriesViewProps {
    matches?: {
        series: string
    }
}

export const SeriesView: FunctionalComponent<SeriesViewProps> = props => {
    const name = props.matches?.series ?? ''
    const listName = `series:${name}`
    const seriesList = useCached(listName, {name: name}, DB.series, series.list, series.cachedList)
    if (seriesList === null) {
        return <div>loading</div>
    }
    const s = seriesList[0]
    if (s === undefined) {
        return <Error404 />
    }
    return <div>
        <h1>{s.name}</h1>
        <BookList listName={listName} series={s.name} />
    </div>
}