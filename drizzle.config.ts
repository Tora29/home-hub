import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/tables.ts',
	out: './drizzle/migrations',
	dialect: 'sqlite'
});
