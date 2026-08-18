import {
  getOpenAiConversationModel,
  getOpenAiDraftAnswerModel,
  getPerplexityAgentPreset,
  isOpenAiConfigured,
  isPerplexityConfigured
} from "@/lib/openAiConfig";

export default function SettingsPage() {
  const openAiOn = isOpenAiConfigured();
  const perplexityOn = isPerplexityConfigured();
  const basicAuthOn = Boolean(process.env.BASIC_AUTH_USER?.trim() && process.env.BASIC_AUTH_PASSWORD?.trim());

  return (
    <div className="space-y-4 max-w-3xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">設定</h1>
          <p className="page-subtitle">利用上の注意と API 設定。</p>
        </div>
      </header>

      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="section-title">正本テキスト（著作権）</h2>
        <p>
          本ツールは <strong>企業会計基準委員会（ASBJ）</strong> が公表する会計基準・適用指針の HTML
          を正本として項を登録します。再配布・商用利用は FASF / ASBJ の利用条件に従ってください。各基準の{" "}
          <code>licenseNote</code> で注記を編集できます。
        </p>
      </section>

      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="section-title">OpenAI API（対話・回答案）</h2>
        <p className="text-xs">
          状態:{" "}
          <span className={openAiOn ? "font-medium text-blue-700" : "font-medium text-amber-800"}>
            {openAiOn ? "設定済み" : "未設定"}
          </span>
        </p>
        {openAiOn ? (
          <ul className="text-xs text-slate-700 space-y-1">
            <li>
              対話（追加質問）: <code>{getOpenAiConversationModel()}</code>
            </li>
            <li>
              回答案・再生成: <code>{getOpenAiDraftAnswerModel()}</code>
            </li>
          </ul>
        ) : (
          <p className="text-xs text-amber-900 rounded border border-amber-200 bg-amber-50 px-3 py-2">
            <code>OPENAI_API_KEY</code> がない場合、対話・回答案はダミー応答のみです。
          </p>
        )}
        <p className="text-xs text-slate-600">
          既定はどちらも <code>gpt-5.6-luna</code> です。将来は{" "}
          <code>OPENAI_MODEL_CONVERSATION</code> と <code>OPENAI_MODEL_DRAFT_ANSWER</code>{" "}
          で分けられます。
        </p>      </section>

      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="section-title">Perplexity API（補助検索）</h2>
        <p className="text-xs">
          状態:{" "}
          <span className={perplexityOn ? "font-medium text-blue-700" : "font-medium text-amber-800"}>
            {perplexityOn ? `設定済み（Agent API / ${getPerplexityAgentPreset()}）` : "未設定（ダミー結果）"}
          </span>
        </p>
        {perplexityOn ? (
          <p className="text-xs text-slate-600">
            Sonar Chat Completions から Agent API（<code>/v1/agent</code>）へ移行済みです。
            品質を上げる場合は <code>PERPLEXITY_AGENT_PRESET</code> を <code>low</code> 以上に設定してください。
          </p>
        ) : null}
      </section>

      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="section-title">Basic 認証</h2>
        <p className="text-xs">
          状態:{" "}
          <span className={basicAuthOn ? "font-medium text-blue-700" : "font-medium text-amber-800"}>
            {basicAuthOn ? "有効" : "無効（ローカル用）"}
          </span>
        </p>
        <p className="text-xs text-slate-600">
          Vercel 公開時は <code>BASIC_AUTH_USER</code> と <code>BASIC_AUTH_PASSWORD</code> を設定してください。
        </p>
      </section>

      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="section-title">基準の取込</h2>
        <ol className="list-decimal pl-5 space-y-1 text-xs">
          <li>ASBJ の会計基準検索システムから HTML を保存する。</li>
          <li>
            <a href="/standards/new" className="text-brand hover:underline">
              HTML を取込
            </a>
            でアップロードする（会計基準と適用指針は別ファイルとして取り込む）。
          </li>
        </ol>
      </section>

      <section className="card space-y-2 text-xs leading-relaxed text-slate-700">
        <h2 className="section-title">免責</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>個人の日本基準検討支援用です。最終的な会計判断の責任はユーザーにあります。</li>
          <li>取込条文はユーザーがアップロードした HTML です。公式公表と照合してください。</li>
          <li>本ツールの利用により生じた損害について、開発者は責任を負いません。</li>
        </ul>
      </section>
    </div>
  );
}
