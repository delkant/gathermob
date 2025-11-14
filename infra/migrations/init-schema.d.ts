import { Db } from 'mongodb';
export interface Migration {
    id: string;
    description: string;
    up: (db: Db) => Promise<void>;
    down: (db: Db) => Promise<void>;
}
export declare const migration: Migration;
export default migration;
//# sourceMappingURL=init-schema.d.ts.map