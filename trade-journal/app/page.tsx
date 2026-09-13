export default function EntryPage() {
  return (
    <div className="space-y-5 pt-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">市場を選択</h1>
        <p className="mt-1 text-xs text-slate-500">
          同じフィードバックツールで、日経225と FX を分けて記録・分析します。
        </p>
      </div>
      <div className="grid gap-3">
        <a
          href="/nikkei"
          className="rounded-xl border bg-white p-5 shadow-sm active:bg-slate-50"
        >
          <div className="text-base font-semibold text-brand">Nikkei 225</div>
          <p className="mt-1 text-xs text-slate-500">
            日経225先物の投資判断用指標、取引履歴、集計、AI分析
          </p>
        </a>
        <a href="/fx" className="rounded-xl border bg-white p-5 shadow-sm active:bg-slate-50">
          <div className="text-base font-semibold text-brand">FX</div>
          <p className="mt-1 text-xs text-slate-500">
            USD/JPY・EUR/JPY・AUD/JPY の指標表示と、3通貨ペア合算の履歴・集計
          </p>
        </a>
      </div>
    </div>
  );
}
