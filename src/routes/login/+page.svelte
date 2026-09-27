<!--
  @file 画面: ログイン
  @module src/routes/login/+page.svelte
  @feature login

  @description
  Google OAuth でログインする画面。
  "Google でログイン" ボタン 1 つのみ表示し、Better Auth の signIn.social() を呼び出す。
  OAuth エラー時は URL の ?error パラメータを検知してエラーメッセージを表示する。
  signIn.social() 自体の失敗（Better Auth のエラー応答・通信エラー）もその場でエラー表示する。

  @navigation
  - 遷移先: Google OAuth 同意画面 → /api/auth/callback/google → / - 認証成功後
  - 遷移先: /login?error=... - OAuth 失敗時（Better Auth がリダイレクト）

  @api
  - POST /api/auth/sign-in/social → 200 { url, redirect } - Google OAuth 開始（Better Auth 管理）
  - GET /api/auth/callback/google → 302 / - OAuth コールバック（Better Auth 管理）
-->
<script lang="ts">
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import Button from '$lib/components/Button.svelte';

	let isLoading = $state(false);
	let signInError = $state('');
	const hasOAuthError = $derived(!!page.url.searchParams.get('error'));

	async function handleGoogleLogin() {
		isLoading = true;
		signInError = '';
		try {
			// 成功時は Better Auth が Google の同意画面へ遷移させる。失敗時は error が返る（throw しない）
			const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
			if (result.error) {
				signInError = 'ログインを開始できませんでした。もう一度お試しください。';
				isLoading = false;
			}
		} catch {
			signInError = '通信エラーが発生しました';
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

		{#if signInError}
			<p
				data-testid="login-signin-error"
				role="alert"
				class="mb-4 text-center text-sm text-destructive"
			>
				{signInError}
			</p>
		{:else if hasOAuthError}
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
