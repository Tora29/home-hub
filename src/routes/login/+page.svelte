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
	import { loginSchema } from './_lib/schema';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isLoading = $state(false);
	let errors = $state({ email: '', password: '', auth: '' });

	async function handleSubmit() {
		errors = { email: '', password: '', auth: '' };

		const result = loginSchema.safeParse({ email, password });
		if (!result.success) {
			for (const issue of result.error.issues) {
				const field = issue.path[0] as 'email' | 'password';
				if (!errors[field]) errors[field] = issue.message;
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
				errors.auth = 'メールアドレスまたはパスワードが正しくありません';
				return;
			}

			await goto('/');
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

		<form
			data-testid="login-form"
			novalidate
			onsubmit={(e) => {
				e.preventDefault();
				void handleSubmit();
			}}
			class="flex flex-col gap-5"
		>
			{#if errors.auth}
				<p data-testid="login-auth-error" class="text-center text-sm text-destructive">
					{errors.auth}
				</p>
			{/if}

			<div class="flex flex-col gap-1">
				<label for="login-email" class="text-sm font-medium text-label">メールアドレス</label>
				<Input
					id="login-email"
					type="email"
					data-testid="login-email-input"
					bind:value={email}
					autocomplete="email"
					size="lg"
					class="w-full"
				/>
				{#if errors.email}
					<p data-testid="login-email-error" class="text-xs text-destructive">{errors.email}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1">
				<label for="login-password" class="text-sm font-medium text-label">パスワード</label>
				<div class="relative">
					<Input
						id="login-password"
						type={showPassword ? 'text' : 'password'}
						data-testid="login-password-input"
						bind:value={password}
						autocomplete="current-password"
						size="lg"
						class="w-full pr-12"
					/>
					<button
						type="button"
						data-testid="login-password-toggle"
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
						class="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-secondary hover:text-label focus-visible:ring-2 focus-visible:ring-accent"
					>
						{#if showPassword}
							<EyeOff size={18} />
						{:else}
							<Eye size={18} />
						{/if}
					</button>
				</div>
				{#if errors.password}
					<p data-testid="login-password-error" class="text-xs text-destructive">
						{errors.password}
					</p>
				{/if}
			</div>

			<Button
				type="submit"
				data-testid="login-submit-button"
				disabled={isLoading}
				aria-busy={isLoading}
				variant="primary"
				size="lg"
				class="w-full justify-center"
			>
				{isLoading ? 'ログイン中...' : 'ログイン'}
			</Button>
		</form>
	</div>
</div>
