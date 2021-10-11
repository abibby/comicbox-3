import Dexie from 'dexie';
import { Book, Series } from './models';

class AppDatabase extends Dexie {
    books: Dexie.Table<Book, number>;
    series: Dexie.Table<Series, number>;

    constructor () {
        super("AppDatabase");
        this.version(1).stores({
            books: '&id, series, sort',
            series: '&name',
        });
        this.books = this.table("books");
        this.series = this.table("series");
    }
}

export const DB = new AppDatabase()
