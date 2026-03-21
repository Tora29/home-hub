import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ platformProxy: { remoteBindings: false } })
	},
	compilerOptions: {
		runes: true
	}
};

export default config;
