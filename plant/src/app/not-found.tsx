import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4 text-center text-forest-800/80">
      <h1 className="text-lg font-medium">見つかりません</h1>
      <Link href="/" className="text-forest-800 underline">
        トップへ
      </Link>
    </div>
  );
}
