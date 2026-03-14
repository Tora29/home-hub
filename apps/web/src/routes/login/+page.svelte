<!--
  @file 画面: ログイン
  @module apps/web/src/routes/login/+page.svelte
  @feature auth

  @description
  ログイン画面。メールアドレスとパスワードで認証を行う。
  未認証ユーザーのエントリーポイント。

  @spec specs/auth/spec.md
  @acceptance AC-001, AC-003, AC-004, AC-101, AC-102, AC-201, AC-202

  @navigation
  - 遷移元: 全ページ（未認証時リダイレクト）
  - 遷移先: / - ログイン成功後

  @api
  - POST /api/auth/sign-in/email → 200 Session - ログイン
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_API_BASE_URL } from '$env/static/public';
	import { currentUser } from '$lib/stores/auth';
	import LoginForm from './components/LoginForm.svelte';

	async function handleLoginSuccess() {
		// ログイン後にセッション取得してストアを更新
		try {
			const res = await fetch(`${PUBLIC_API_BASE_URL}/api/auth/session`, {
				credentials: 'include'
			});
			if (res.ok) {
				const data = await res.json();
				currentUser.set(data?.user ?? null);
			}
		} catch {
			// セッション取得失敗でもリダイレクトは続行
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto('/');
	}
</script>

<svelte:head>
	<title>ログイン - 今日の献立</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-bg-grouped px-4"
	style="padding-top: max(2rem, env(safe-area-inset-top)); padding-bottom: max(2rem, env(safe-area-inset-bottom));"
>
	<div class="w-full max-w-sm">
		<!-- タイトル -->
		<div class="mb-8 text-center">
			<h1 class="text-ios-large-title font-bold text-label">今日の献立</h1>
			<p class="mt-2 text-ios-subheadline text-secondary">ログインしてください</p>
		</div>

		<!-- フォームカード -->
		<div class="rounded-2xl bg-bg-card px-6 py-8 shadow-sm">
			<LoginForm onSuccess={handleLoginSuccess} />
		</div>
	</div>
</div>
