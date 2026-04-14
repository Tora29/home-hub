import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ platformProxy: { remoteBindings: false } }),
		alias: {
			$expenses: 'src/routes/expenses',
			$recipes: 'src/routes/recipes',
			$dashboard: 'src/routes/dashboard'
		}
	},
	compilerOptions: {
		runes: true
	}
};

export default config;
