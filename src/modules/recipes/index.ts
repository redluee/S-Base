import type { Database } from "bun:sqlite";


export class RecipeService {
    private db: Database;

	constructor(db: Database) {
		this.db = db;
	}

    
}