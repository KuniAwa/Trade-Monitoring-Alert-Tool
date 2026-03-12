import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function createCase(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const topicLabel = String(formData.get("topicLabel") ?? "").trim() || null;
  const standard = String(formData.get("standard") ?? "JGAAP");
  const transactionSummary = String(formData.get("transactionSummary") ?? "").trim();
  const initialQuestion = String(formData.get("initialQuestion") ?? "").trim();
  const standardLinksRaw = String(formData.get("standardLinks") ?? "");
  const notebookSummary = String(formData.get("notebookSummary") ?? "").trim();

  if (!title || !transactionSummary || !initialQuestion) {
    throw new Error("ケース名・取引概要・最初の質問は必須です。");
  }

  const links = standardLinksRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const created = await prisma.case.create({
    data: {
      title,
      topicLabel,
      standard: standard === "IFRS" ? "IFRS" : standard === "BOTH" ? "BOTH" : "JGAAP",
      transactionSummary,
      initialQuestion,
      standardLinks: {
        create: links.map((url) => ({
          url,
          standard: standard === "IFRS" ? "IFRS" : standard === "BOTH" ? "BOTH" : "JGAAP"
        }))
      },
      notebookSummaries: notebookSummary
        ? {
            create: {
              content: notebookSummary
            }
          }
        : undefined
    }
  });

  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/cases/${created.id}`);
}

export default function NewCasePage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">新規ケース作成</h1>
          <p className="page-subtitle">
            会計論点ごとにケースを登録し、後から詳細検討とQ&Aを行います。
          </p>
        </div>
      </header>

      <form action={createCase} className="space-y-4 card">
        <div>
          <label className="section-title">ケース名</label>
          <p className="section-help">例: 「ストックオプション付与のIFRS処理」</p>
          <input name="title" className="input" required />
        </div>

        <div>
          <label className="section-title">論点ラベル</label>
          <p className="section-help">自由入力の短いタグです（例: 収益認識, リース）</p>
          <input name="topicLabel" className="input" />
        </div>

        <div>
          <label className="section-title">会計基準区分</label>
          <p className="section-help">日本基準 / IFRS / 両方 から選択します。</p>
          <select name="standard" className="input">
            <option value="JGAAP">日本基準</option>
            <option value="IFRS">IFRS</option>
            <option value="BOTH">両方</option>
          </select>
        </div>

        <div>
          <label className="section-title">取引概要</label>
          <textarea
            name="transactionSummary"
            rows={4}
            className="textarea"
            placeholder="取引の背景・スキーム・金額規模などを簡潔に記載してください。"
          />
        </div>

        <div>
          <label className="section-title">最初の質問</label>
          <textarea
            name="initialQuestion"
            rows={3}
            className="textarea"
            placeholder="AI にまず聞きたい論点や不明点を記載してください。"
          />
        </div>

        <div>
          <label className="section-title">会計基準リンク</label>
          <p className="section-help">
            関連する会計基準やガイダンスへのURLを複数入力できます（後で専用UIに差し替え）。
          </p>
          <textarea
            name="standardLinks"
            rows={3}
            className="textarea"
            placeholder="1行に1つずつURLを記載してください。"
          />
        </div>

        <div>
          <label className="section-title">NotebookLM 要約</label>
          <p className="section-help">
            NotebookLMで作成した要約をそのまま貼り付けてください（API連携は後で追加予定）。
          </p>
          <textarea
            name="notebookSummary"
            rows={6}
            className="textarea"
            placeholder="ここにNotebookLMの要約テキストを貼り付けてください。"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="submit" className="primary-button">
            ケースを作成
          </button>
        </div>
      </form>
    </div>
  );
}

