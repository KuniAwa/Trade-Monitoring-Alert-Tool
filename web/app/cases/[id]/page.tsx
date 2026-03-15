import { prisma } from "@/lib/prisma";
import { searchPerplexity } from "@/lib/perplexity";
import { callAi } from "@/lib/aiClient";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

interface CaseDetailPageProps {
  params: { id: string };
}

async function runPerplexitySearch(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  const query = String(formData.get("query") ?? "").trim();

  if (!caseId || !query) {
    throw new Error("検索に必要な情報が不足しています。");
  }

  const results = await searchPerplexity(query);

  await prisma.searchResult.createMany({
    data: results.map((r) => ({
      caseId,
      query,
      title: r.title,
      snippet: r.snippet,
      url: r.url,
      source: r.source,
      rawJson: null
    }))
  });

  revalidatePath(`/cases/${caseId}`);
}

async function submitConversation(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!caseId || !content) {
    throw new Error("回答内容が空です。");
  }

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      standardLinks: true,
      notebookSummaries: true,
      conversationTurns: {
        orderBy: { createdAt: "asc" }
      },
      searchResults: true
    }
  });

  if (!c) {
    throw new Error("ケースが見つかりませんでした。");
  }

  // ユーザー回答を保存
  await prisma.conversationTurn.create({
    data: {
      caseId,
      role: "USER",
      mode: "FOLLOWUP_QUESTION",
      content
    }
  });

  const aiMessage = await callAi({
    mode: "FOLLOWUP",
    payload: {
      standard: c.standard as "JGAAP" | "IFRS" | "BOTH",
      topicLabel: c.topicLabel ?? null,
      transactionSummary: c.transactionSummary,
      initialQuestion: c.initialQuestion,
      standardLinks: c.standardLinks.map((l) => l.url),
      notebookSummaries: c.notebookSummaries.map((n) => n.content),
      previousConversation: [
        ...c.conversationTurns.map((t) => ({
          role: t.role === "USER" ? "user" : "assistant" as const,
          content: t.content
        })),
        { role: "user", content }
      ],
      searchResults: c.searchResults.map((r) => ({
        query: r.query,
        title: r.title,
        snippet: r.snippet,
        url: r.url,
        source: r.source
      }))
    }
  });

  await prisma.conversationTurn.create({
    data: {
      caseId,
      role: "ASSISTANT",
      mode: "FOLLOWUP_QUESTION",
      content: aiMessage
    }
  });

  revalidatePath(`/cases/${caseId}`);
}

async function generateDraftAnswer(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");

  if (!caseId) {
    throw new Error("ケースIDがありません。");
  }

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      standardLinks: true,
      notebookSummaries: true,
      conversationTurns: {
        orderBy: { createdAt: "asc" }
      },
      searchResults: true
    }
  });

  if (!c) {
    throw new Error("ケースが見つかりませんでした。");
  }

  let pastFeedbackFromSameTopic: string | undefined;
  const topicLabel = (c.topicLabel ?? "").trim();
  if (topicLabel) {
    const sameTopicCases = await prisma.case.findMany({
      where: {
        id: { not: caseId },
        topicLabel,
        feedbacks: { some: {} }
      },
      include: {
        feedbacks: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (sameTopicCases.length > 0) {
      pastFeedbackFromSameTopic = sameTopicCases
        .map((other) => {
          const fb = other.feedbacks[0];
          const ratingLabel =
            fb?.rating === "ADEQUATE"
              ? "妥当"
              : fb?.rating === "INSUFFICIENT"
                ? "不足"
                : fb?.rating === "INCORRECT"
                  ? "誤り"
                  : fb?.rating === "RECONSIDER"
                    ? "要再検討"
                    : fb?.rating ?? "—";
          return `・過去ケース「${other.title}」: 評価=${ratingLabel}${fb?.comment ? `, コメント=${fb.comment}` : ""}`;
        })
        .join("\n");
    }
  }

  const aiAnswer = await callAi({
    mode: "DRAFT_ANSWER",
    payload: {
      standard: c.standard as "JGAAP" | "IFRS" | "BOTH",
      transactionSummary: c.transactionSummary,
      initialQuestion: c.initialQuestion,
      standardLinks: c.standardLinks.map((l) => l.url),
      notebookSummaries: c.notebookSummaries.map((n) => n.content),
      conversation: c.conversationTurns.map((t) => ({
        role: t.role === "USER" ? "user" : "assistant" as const,
        content: t.content
      })),
      searchSummaries: c.searchResults.map(
        (r) => `${r.title}\n${r.snippet}\n${r.url} [${r.source}]`
      ),
      pastFeedbackFromSameTopic
    }
  });

  await prisma.draftAnswer.create({
    data: {
      caseId,
      structuredAnswerJson: aiAnswer,
      summary: aiAnswer.slice(0, 4000)
    }
  });

  revalidatePath(`/cases/${caseId}`);
}

async function saveFeedback(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  const rating = String(formData.get("rating") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!caseId || !rating) {
    throw new Error("評価が選択されていません。");
  }

  const latestDraft = await prisma.draftAnswer.findFirst({
    where: { caseId },
    orderBy: { createdAt: "desc" }
  });

  await prisma.feedback.create({
    data: {
      caseId,
      draftId: latestDraft?.id,
      rating: rating as "ADEQUATE" | "INSUFFICIENT" | "INCORRECT" | "RECONSIDER",
      comment
    }
  });

  // フィードバック保存後はダッシュボードに戻る
  revalidatePath("/");
  revalidatePath("/history");
  redirect("/");
}

async function deleteCase(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) {
    throw new Error("ケースIDがありません。");
  }

  await prisma.case.delete({
    where: { id: caseId }
  });

  revalidatePath("/");
  revalidatePath("/history");
  redirect("/");
}

async function getCase(id: string) {
  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      standardLinks: true,
      notebookSummaries: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      searchResults: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      conversationTurns: {
        orderBy: { createdAt: "asc" }
      },
      draftAnswers: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      feedbacks: {
        orderBy: { createdAt: "desc" },
        take: 3
      }
    }
  });
  return c;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = params;
  const c = await getCase(id);

  if (!c) notFound();

  const latestNotebook = c.notebookSummaries[0];
  const latestDraft = c.draftAnswers[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="space-y-4">
        <header className="page-header">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">ケース詳細</h1>
              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-200 bg-slate-100 text-slate-600">
                {c.feedbacks.length > 0 ? "回答済" : "検討中"}
              </span>
            </div>
            <p className="page-subtitle">
              ケース情報・NotebookLM要約・基準リンクを確認しながら対話を進めます。
            </p>
          </div>
          <form action={deleteCase} className="flex items-center gap-2">
            <input type="hidden" name="caseId" value={c.id} />
            <button
              type="submit"
              className="secondary-button text-[11px] text-red-700 border-red-300 hover:bg-red-50"
            >
              ケースを削除
            </button>
          </form>
        </header>

        <div className="card space-y-1 text-sm">
          <h2 className="section-title">ケース情報</h2>
          <div className="text-xs text-slate-500 mb-1">
            <span className="mr-2 font-mono text-[11px] text-slate-400">ID: {c.id}</span>
            {c.topicLabel && <span className="mr-2">#{c.topicLabel}</span>}
            <span>
              {c.standard === "JGAAP"
                ? "日本基準"
                : c.standard === "IFRS"
                ? "IFRS"
                : "日本基準 / IFRS"}
            </span>
          </div>
          <div className="font-medium text-slate-900">{c.title}</div>
          <div className="mt-2">
            <div className="section-title">取引概要</div>
            <p className="text-xs whitespace-pre-wrap">{c.transactionSummary}</p>
          </div>
          <div className="mt-2">
            <div className="section-title">最初の質問</div>
            <p className="text-xs whitespace-pre-wrap">{c.initialQuestion}</p>
          </div>
          {c.standardLinks.length > 0 && (
            <div className="mt-2">
              <div className="section-title">会計基準リンク</div>
              <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
                {c.standardLinks.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline break-all"
                    >
                      {l.label ?? l.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {latestNotebook && (
            <div className="mt-2">
              <div className="section-title">NotebookLM 要約（最新）</div>
              <p className="text-xs whitespace-pre-wrap max-h-56 overflow-auto border rounded p-2 bg-slate-50">
                {latestNotebook.content}
              </p>
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <div>
            <h2 className="section-title">対話（Q&amp;A）</h2>
            <p className="section-help">
              追加質問とユーザー回答を数回繰り返した後、回答案を生成します。
            </p>
          </div>
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-600 max-h-64 overflow-auto space-y-1">
            {c.conversationTurns.length === 0 ? (
              <p>まだ対話はありません。検索と追加質問から始めてください。</p>
            ) : (
              c.conversationTurns.map((t) => (
                <div key={t.id}>
                  <span className="font-semibold">
                    {t.role === "USER" ? "ユーザー" : t.role === "ASSISTANT" ? "AI" : "システム"}
                    :
                  </span>{" "}
                  <span className="whitespace-pre-wrap">{t.content}</span>
                </div>
              ))
            )}
          </div>
          <form action={submitConversation} className="space-y-2">
            <input type="hidden" name="caseId" value={c.id} />
            <label className="section-title">AIへの回答 / 追加情報</label>
            <textarea
              name="content"
              className="textarea"
              rows={3}
              placeholder="AIからの質問に対する回答や、追加で伝えたい事実を記載してください。"
            />
            <div className="flex gap-2 justify-end">
              <button type="submit" className="primary-button">
                回答を送信
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <div className="card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="section-title">Perplexity 検索</h2>
              <p className="section-help">
                関連する外部情報を補助的に取得します（基準リンクとNotebookLM要約を優先して解釈）。
              </p>
            </div>
            <form action={runPerplexitySearch} className="flex items-center gap-2">
              <input type="hidden" name="caseId" value={c.id} />
              <input
                name="query"
                className="input text-xs w-40"
                defaultValue={c.title}
                placeholder="検索クエリ"
              />
              <button className="secondary-button text-xs" type="submit">
                検索を実行
              </button>
            </form>
          </div>
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-600 max-h-60 overflow-auto space-y-2">
            {c.searchResults.length === 0 ? (
              <p>まだ検索結果はありません。</p>
            ) : (
              c.searchResults.map((r) => (
                <div key={r.id} className="border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="font-semibold">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      {r.title}
                    </a>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-1">{r.source}</div>
                  <p className="text-xs whitespace-pre-wrap">{r.snippet}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="section-title">回答案</h2>
              <p className="section-help">
                追加質問を数回行った後、会計処理の選択肢と推奨案をこの形式で出力します。
              </p>
            </div>
            <form action={generateDraftAnswer}>
              <input type="hidden" name="caseId" value={c.id} />
              <button type="submit" className="secondary-button text-xs">
                回答案を生成
              </button>
            </form>
          </div>
          {latestDraft ? (
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs max-h-80 overflow-auto whitespace-pre-wrap">
              {latestDraft.summary ?? latestDraft.structuredAnswerJson}
            </div>
          ) : (
            <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
              <li>論点</li>
              <li>追加確認した事実</li>
              <li>会計処理の選択肢 A/B/C（適用条件・メリット/デメリット）</li>
              <li>推奨案（前提条件付き）</li>
              <li>仕訳例</li>
              <li>参照情報</li>
              <li>不確実性 / 残論点</li>
            </ul>
          )}
        </div>

        <div className="card space-y-2">
          <h2 className="section-title">フィードバック</h2>
          <p className="section-help">
            回答案に対する評価とコメントを保存し、将来の再生成に活用します。
          </p>
          <form action={saveFeedback} className="space-y-2">
            <input type="hidden" name="caseId" value={c.id} />
            <select name="rating" className="input text-sm">
              <option value="">評価を選択してください</option>
              <option value="ADEQUATE">妥当</option>
              <option value="INSUFFICIENT">不足</option>
              <option value="INCORRECT">誤り</option>
              <option value="RECONSIDER">要再検討</option>
            </select>
            <textarea
              name="comment"
              rows={3}
              className="textarea"
              placeholder="具体的にどの点が妥当 / 不足 / 誤りかをメモしておくと、後からの再検討に役立ちます。"
            />
            <div className="flex justify-end">
              <button type="submit" className="secondary-button">
                フィードバックを保存
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

