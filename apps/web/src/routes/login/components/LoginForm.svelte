<!--
  @file コンポーネント: LoginForm
  @module apps/web/src/routes/login/components/LoginForm.svelte
  @feature auth

  @description
  ログインフォーム。メールアドレス・パスワード入力、バリデーション、送信処理を担う。

  @props
  - onSuccess: () => void - ログイン成功時のコールバック

  @spec specs/auth/spec.md
  @acceptance AC-001, AC-101, AC-102, AC-201, AC-202
-->

<script lang="ts">
	import { loginSchema } from '@what-to-eat/shared';
	import { createSession } from '../apis/createSession';

	type Props = {
		onSuccess: () => void;
	};

	let { onSuccess }: Props = $props();

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);

	// フィールドエラー
	let emailError = $state('');
	let passwordError = $state('');

	// APIエラー（フォーム上部表示）
	let apiError = $state('');

	function validate(): boolean {
		const result = loginSchema.safeParse({ email, password });

		emailError = '';
		passwordError = '';

		if (result.success) return true;

		for (const issue of result.error.issues) {
			const field = issue.path[0];
			if (field === 'email') emailError = issue.message;
			if (field === 'password') passwordError = issue.message;
		}
		return false;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		apiError = '';

		if (!validate()) return;

		isLoading = true;
		try {
			const result = await createSession({ email, password });
			if (result.ok) {
				onSuccess();
			} else {
				apiError = result.message;
			}
		} catch {
			apiError = 'エラーが発生しました。しばらく待ってから再試行してください。';
		} finally {
			isLoading = false;
		}
	}
</script>

<form
	data-testid="auth-create-form"
	onsubmit={handleSubmit}
	class="flex flex-col gap-5 w-full"
	novalidate
>
	<!-- APIエラー表示エリア -->
	{#if apiError}
		<div
			role="alert"
			class="rounded-xl bg-destructive/10 px-4 py-3 text-ios-subheadline text-destructive"
		>
			{apiError}
		</div>
	{/if}

	<!-- メールアドレス -->
	<div class="flex flex-col gap-1">
		<label for="auth-email" class="text-ios-subheadline font-medium text-label">
			メールアドレス
		</label>
		<input
			id="auth-email"
			data-testid="auth-email-input"
			type="email"
			autocomplete="email"
			inputmode="email"
			bind:value={email}
			aria-describedby={emailError ? 'auth-email-error' : undefined}
			aria-invalid={emailError ? 'true' : undefined}
			class="min-h-[44px] rounded-xl border border-separator bg-bg-secondary px-4 py-3 text-ios-body text-label placeholder:text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
			placeholder="example@email.com"
		/>
		{#if emailError}
			<span id="auth-email-error" role="alert" class="text-ios-caption1 text-destructive">
				{emailError}
			</span>
		{/if}
	</div>

	<!-- パスワード -->
	<div class="flex flex-col gap-1">
		<label for="auth-password" class="text-ios-subheadline font-medium text-label">
			パスワード
		</label>
		<input
			id="auth-password"
			data-testid="auth-password-input"
			type="password"
			autocomplete="current-password"
			bind:value={password}
			aria-describedby={passwordError ? 'auth-password-error' : undefined}
			aria-invalid={passwordError ? 'true' : undefined}
			class="min-h-[44px] rounded-xl border border-separator bg-bg-secondary px-4 py-3 text-ios-body text-label placeholder:text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
			placeholder="パスワード"
		/>
		{#if passwordError}
			<span id="auth-password-error" role="alert" class="text-ios-caption1 text-destructive">
				{passwordError}
			</span>
		{/if}
	</div>

	<!-- ログインボタン -->
	<button
		data-testid="auth-submit-button"
		type="submit"
		disabled={isLoading}
		class="min-h-[50px] w-full rounded-xl bg-accent text-white text-ios-headline font-semibold disabled:opacity-50 transition-opacity duration-150 ease-[var(--ease-ios)] touch-manipulation"
	>
		{isLoading ? '処理中...' : 'ログイン'}
	</button>
</form>
