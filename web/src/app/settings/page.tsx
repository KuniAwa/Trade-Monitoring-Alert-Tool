export default function SettingsPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">利用方法・注意事項</h1>
          <p className="page-subtitle">
            本ツールの前提・使い方・免責事項を確認してください。
          </p>
        </div>
      </header>

      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="section-title">目的</h2>
        <p>
          本アプリは、日本基準およびIFRSに関する会計論点について、関連情報の整理と検討プロセスの可視化を支援することを目的とした
          <span className="font-semibold">個人用ツール</span>
          です。
        </p>
      </section>

      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="section-title">使い方（MVP版）</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>「新規ケース作成」から論点ごとにケースを登録します。</li>
          <li>ケース詳細画面でNotebookLM要約や基準リンク、対話履歴、検索結果を確認します。</li>
          <li>AIとのQ&Aを数回繰り返した後、回答案を確認し、自分の判断を整理します。</li>
          <li>回答案に対するフィードバックを残し、将来の再検討のメモとして活用します。</li>
        </ol>
      </section>

      <section className="card space-y-2 text-xs leading-relaxed text-slate-700">
        <h2 className="section-title">重要な注意事項（免責）</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            本アプリは会計判断の検討支援を目的とする個人用ツールであり、最終判断は利用者自身が行うものとします。
          </li>
          <li>
            AIによる出力（追加質問、回答案、検索結果の要約など）は、誤りや不足を含む可能性があります。必ず一次情報（会計基準・ガイダンス・専門書等）を参照し、自ら検証してください。
          </li>
          <li>
            Web検索結果はあくまで補助情報であり、会計基準リンクおよびNotebookLM要約に基づく検討を優先します。
          </li>
          <li>
            本アプリの利用により生じたいかなる損失・損害についても、開発者は責任を負いません。
          </li>
        </ul>
      </section>
    </div>
  );
}

