import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ platformProxy: { remoteBindings: false } }),
		alias: {
			$expenses: 'src/lib/features/expenses',
			$recipes: 'src/lib/features/recipes',
			$dashboard: 'src/lib/features/dashboard',
			$workout: 'src/lib/features/workout',
			$calendar: 'src/lib/features/calendar'
		}
	},
	compilerOptions: {
		runes: true
	}
};

export default config;
