import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <p className="text-forest-800/80">
        iPhone から同じ家の人と共有のパスワードでログインし、撮影した山野草の写真を送ると
        <strong> Pl@ntNet</strong> で識別し、加えて <strong>LLM</strong> が和名・説明の補強を行います。写真は保存しません。
      </p>
      <div className="grid gap-3">
        <Link
          href="/identify"
          className="block rounded-xl border border-forest-800/20 bg-white px-4 py-4 text-center text-lg font-medium text-forest-800 shadow-sm active:scale-[0.99]"
        >
          植物を識別する
        </Link>
        <Link
          href="/records"
          className="block rounded-xl border border-forest-800/10 bg-forest-800/5 px-4 py-3 text-center text-forest-800"
        >
          履歴を見る
        </Link>
      </div>
    </div>
  );
}
