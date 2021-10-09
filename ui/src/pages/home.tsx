import { FunctionalComponent, h } from "preact";
import { BookList } from "../components/book-list";

export const Home: FunctionalComponent = props => {
    return <div>
        <h1>Home</h1>
        <BookList />
    </div>
}