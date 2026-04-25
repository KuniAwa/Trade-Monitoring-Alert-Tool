import { IdentifyForm } from "@/components/IdentifyForm";

export const dynamic = "force-dynamic";

export default function IdentifyPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-forest-800">新しい識別</h2>
      <p className="text-sm text-forest-800/60">写真を選び、分かる範囲で情報を入れてください。</p>
      <IdentifyForm />
    </div>
  );
}
