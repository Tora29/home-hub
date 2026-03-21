<!--
  @file 画面: ログイン
  @module src/routes/login/+page.svelte
  @feature login

  @description
  メールアドレスとパスワードで認証するログイン画面。
  クライアントサイドバリデーション後、Better Auth の signIn.email() を呼び出す。
  認証成功後はルートページ（/）へ遷移する。

  @spec specs/login/spec.md
  @acceptance AC-001, AC-002, AC-101, AC-102, AC-103, AC-104

  @navigation
  - 遷移先: / - ホーム画面（認証成功後）
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { Eye, EyeOff } from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { loginSchema } from './schema';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isLoading = $state(false);
	let emailError = $state('');
	let passwordError = $state('');
	let authError = $state('');

	async function handleSubmit() {
		emailError = '';
		passwordError = '';
		authError = '';

		const result = loginSchema.safeParse({ email, password });
		if (!result.success) {
			for (const issue of result.error.issues) {
				if (issue.path[0] === 'email' && !emailError) emailError = issue.message;
				if (issue.path[0] === 'password' && !passwordError) passwordError = issue.message;
			}
			return;
		}

		isLoading = true;
		try {
			const { error } = await authClient.signIn.email({
				email: result.data.email,
				password: result.data.password
			});

			if (error) {
				authError = 'メールアドレスまたはパスワードが正しくありません';
				return;
			}

			await goto('/');
		} finally {
			isLoading = false;
		}
	}
</script>

<div
	class="bg-bg-grouped min-h-screen flex items-center justify-center p-4"
	style="background-image: radial-gradient(circle, rgba(180,155,135,.2) 1px, transparent 1px); background-size: 20px 20px;"
>
	<div class="bg-bg-card rounded-3xl p-8 shadow-md w-full max-w-sm">
		<div class="text-center mb-8">
			<h1 class="text-2xl font-medium text-label">Home Hub</h1>
			<p class="text-secondary text-sm mt-1">暮らしをふたりで</p>
		</div>

		<form
			data-testid="login-form"
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="flex flex-col gap-5"
		>
			{#if authError}
				<p data-testid="login-auth-error" class="text-destructive text-sm text-center">
					{authError}
				</p>
			{/if}

			<div class="flex flex-col gap-1">
				<label for="login-email" class="text-label text-sm font-medium">メールアドレス</label>
				<input
					id="login-email"
					type="email"
					data-testid="login-email-input"
					bind:value={email}
					autocomplete="email"
					class="border border-separator rounded-2xl px-4 py-3 text-label bg-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
				/>
				{#if emailError}
					<p data-testid="login-email-error" class="text-destructive text-xs">{emailError}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1">
				<label for="login-password" class="text-label text-sm font-medium">パスワード</label>
				<div class="relative">
					<input
						id="login-password"
						type={showPassword ? 'text' : 'password'}
						data-testid="login-password-input"
						bind:value={password}
						autocomplete="current-password"
						class="w-full border border-separator rounded-2xl px-4 py-3 pr-12 text-label bg-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					/>
					<button
						type="button"
						data-testid="login-password-toggle"
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-label rounded-lg p-1 focus-visible:ring-2 focus-visible:ring-accent"
					>
						{#if showPassword}
							<EyeOff size={18} />
						{:else}
							<Eye size={18} />
						{/if}
					</button>
				</div>
				{#if passwordError}
					<p data-testid="login-password-error" class="text-destructive text-xs">{passwordError}</p>
				{/if}
			</div>

			<button
				type="submit"
				data-testid="login-submit-button"
				disabled={isLoading}
				aria-busy={isLoading}
				class="bg-accent text-white rounded-2xl px-6 py-3 font-medium w-full shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
			>
				{isLoading ? 'ログイン中...' : 'ログイン'}
			</button>
		</form>
	</div>
</div>
