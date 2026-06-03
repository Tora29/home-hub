<!--
  @file 画面: ログイン
  @module src/routes/login/+page.svelte
  @feature login

  @description
  Google OAuth でログインする画面。
  "Google でログイン" ボタン 1 つのみ表示し、Better Auth の signIn.social() を呼び出す。
  OAuth エラー時は URL の ?error パラメータを検知してエラーメッセージを表示する。

  @navigation
  - 遷移先: / - ホーム画面（認証成功後）
-->
<script lang="ts">
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import Button from '$lib/components/Button.svelte';

	let isLoading = $state(false);
	const hasError = $derived(!!page.url.searchParams.get('error'));

	async function handleGoogleLogin() {
		isLoading = true;
		try {
			await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
		} finally {
			isLoading = false;
		}
	}
</script>

<div
	class="flex min-h-screen items-center justify-center bg-bg-grouped p-4"
	style="background-image: radial-gradient(circle, var(--color-bg-dot) 1px, transparent 1px); background-size: 20px 20px;"
>
	<div class="w-full max-w-sm rounded-3xl bg-bg-card p-8 shadow-md">
		<div class="mb-8 text-center">
			<h1 class="text-2xl font-medium text-label">Home Hub</h1>
			<p class="mt-1 text-sm text-secondary">暮らしをふたりで</p>
		</div>

		{#if hasError}
			<p
				data-testid="login-auth-error"
				role="alert"
				class="mb-4 text-center text-sm text-destructive"
			>
				ログインに失敗しました。もう一度お試しください。
			</p>
		{/if}

		<Button
			data-testid="login-google-button"
			onclick={() => void handleGoogleLogin()}
			disabled={isLoading}
			aria-busy={isLoading}
			variant="primary"
			size="lg"
			class="w-full justify-center"
		>
			{isLoading ? 'ログイン中...' : 'Google でログイン'}
		</Button>
	</div>
</div>
