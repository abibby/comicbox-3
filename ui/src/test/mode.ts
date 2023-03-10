import { DBModel } from 'src/database'

export type PartialDeep<T> = T extends DBModel
    ? {
          [P in keyof T]?: PartialDeep<T[P]>
      }
    : T
