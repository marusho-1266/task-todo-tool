import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "タスク＆Todo管理 — バックログと今日をつなぐ",
  description:
    "抱えているタスクを今日のコミットに変える、GTD発想の時間管理ツール。計画と実績の二層タイムラインで「やった/やらなかった」が一目でわかる。",
  openGraph: {
    title: "タスク＆Todo管理 — バックログと今日をつなぐ",
    description:
      "抱えているタスクを今日のコミットに変える、GTD発想の時間管理ツール。",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div>
      {/* ===== Header ===== */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between border-b px-6 py-4"
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-rule)",
        }}
      >
        <span
          className="text-lg font-medium tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          タスク＆Todo管理
        </span>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--color-ink-muted)" }}
          >
            ログイン
          </Link>
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-accent-ink)",
            }}
          >
            無料で始める →
          </Link>
        </nav>
      </header>

      <main>
        {/* ===== Hero ===== */}
        <section className="mx-auto max-w-5xl px-6 py-24 text-center">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-accent)" }}
          >
            タスク管理 × 時間管理
          </p>
          <h1
            className="mb-6 text-5xl font-medium leading-tight md:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            バックログと今日を、
            <br />
            つなぐ。
          </h1>
          <p
            className="mx-auto mb-10 max-w-xl text-lg leading-relaxed"
            style={{ color: "var(--color-ink-muted)" }}
          >
            抱えているタスクを今日のコミットに変える、GTD発想のタスク管理ツール。
            計画と実績の二層タイムラインで「やった / やらなかった」が一目でわかる。
          </p>
          <div className="mb-16 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: "var(--color-accent)",
                color: "var(--color-accent-ink)",
              }}
            >
              無料で始める →
            </Link>
            <Link
              href="/login"
              className="rounded-lg border px-6 py-3 text-sm font-medium transition-opacity hover:opacity-70"
              style={{
                borderColor: "var(--color-rule-strong)",
                color: "var(--color-ink-muted)",
              }}
            >
              ログインはこちら
            </Link>
          </div>

          {/* Timeline mockup */}
          <div
            className="mx-auto overflow-hidden rounded-xl border"
            style={{
              maxWidth: "480px",
              borderColor: "var(--color-rule)",
              background: "var(--color-paper)",
              boxShadow: "0 8px 40px oklch(22% 0.02 265 / 0.1)",
            }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{
                borderColor: "var(--color-rule)",
                background: "var(--color-paper-2)",
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-ink)" }}
              >
                今日のタイムライン
              </span>
              <span className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                2026年6月13日（金）
              </span>
            </div>

            <div className="relative flex" style={{ height: "183px" }}>
              {/* Time axis */}
              <div
                className="relative w-14 flex-shrink-0 border-r"
                style={{ borderColor: "var(--color-rule)" }}
              >
                {(["09:00", "10:00", "11:00", "12:00"] as const).map((t, i) => (
                  <span
                    key={t}
                    className="absolute text-xs leading-none"
                    style={{
                      top: `${i * 60 + 2}px`,
                      left: "6px",
                      color: "var(--color-ink-faint)",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Blocks area */}
              <div className="relative flex-1">
                {/* Hour grid lines */}
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute w-full border-t"
                    style={{
                      top: `${i * 60}px`,
                      borderColor: "var(--color-rule)",
                    }}
                  />
                ))}

                {/* 朝礼: plan 09:00-09:15, actual 09:00-09:22 */}
                <div
                  className="absolute left-1 right-1 flex items-center rounded px-2 text-xs"
                  style={{
                    top: "2px",
                    height: "14px",
                    border: "1.5px dashed var(--color-plan-border)",
                    background: "var(--color-plan-soft)",
                    color: "var(--color-plan)",
                    zIndex: 2,
                  }}
                >
                  朝礼
                </div>
                <div
                  className="absolute flex items-center rounded px-2 text-xs"
                  style={{
                    top: "2px",
                    left: "28px",
                    right: "4px",
                    height: "21px",
                    borderLeft: "3px solid var(--color-actual)",
                    background: "var(--color-actual-soft)",
                    color: "var(--color-actual)",
                    zIndex: 1,
                  }}
                >
                  22分
                </div>

                {/* メール確認: plan 10:00-10:30, actual 10:00-10:38 */}
                <div
                  className="absolute left-1 right-1 flex items-center rounded px-2 text-xs"
                  style={{
                    top: "62px",
                    height: "29px",
                    border: "1.5px dashed var(--color-plan-border)",
                    background: "var(--color-plan-soft)",
                    color: "var(--color-plan)",
                    zIndex: 2,
                  }}
                >
                  メール確認
                </div>
                <div
                  className="absolute flex items-center rounded px-2 text-xs"
                  style={{
                    top: "62px",
                    left: "28px",
                    right: "4px",
                    height: "37px",
                    borderLeft: "3px solid var(--color-actual)",
                    background: "var(--color-actual-soft)",
                    color: "var(--color-actual)",
                    zIndex: 1,
                  }}
                >
                  38分
                </div>

                {/* 企画書作成: plan 11:00-12:00, actual 11:00-11:42（計測中） */}
                <div
                  className="absolute left-1 right-1 flex items-center rounded px-2 text-xs"
                  style={{
                    top: "122px",
                    height: "54px",
                    border: "1.5px dashed var(--color-plan-border)",
                    background: "var(--color-plan-soft)",
                    color: "var(--color-plan)",
                    zIndex: 2,
                  }}
                >
                  企画書作成（60分）
                </div>
                <div
                  className="absolute flex items-center rounded px-2 text-xs"
                  style={{
                    top: "122px",
                    left: "28px",
                    right: "4px",
                    height: "42px",
                    borderLeft: "3px solid var(--color-actual)",
                    background: "var(--color-actual-soft)",
                    color: "var(--color-actual)",
                    zIndex: 1,
                  }}
                >
                  計測中...
                </div>
              </div>
            </div>

            {/* Legend */}
            <div
              className="flex gap-5 border-t px-4 py-3"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="h-3 w-8 rounded"
                  style={{
                    border: "1.5px dashed var(--color-plan-border)",
                    background: "var(--color-plan-soft)",
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  計画
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-3 w-8 rounded"
                  style={{
                    borderLeft: "3px solid var(--color-actual)",
                    background: "var(--color-actual-soft)",
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  実績
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Pain Section ===== */}
        <section
          className="px-6 py-20"
          style={{ background: "var(--color-paper-2)" }}
        >
          <div className="mx-auto max-w-4xl">
            <h2
              className="mb-12 text-center text-3xl font-medium"
              style={{ fontFamily: "var(--font-display)" }}
            >
              こんな悩み、ありませんか？
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(
                [
                  {
                    icon: "📋",
                    title: "バックログが積み上がる",
                    body: "タスクはどんどん増えるのに、今日何をやるか決まらない。リストを眺めるだけで時間が過ぎていく。",
                  },
                  {
                    icon: "⏱️",
                    title: "計画と実績がずれている",
                    body: "30分のつもりが1時間かかった。でも後から振り返れず、見積もりがいつまでも改善されない。",
                  },
                  {
                    icon: "🔁",
                    title: "繰越しが続くタスク",
                    body: "昨日も、一昨日も繰り越した。そのタスク、今日こそやる必要があるのかすら、曖昧になってきた。",
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: "var(--color-rule)",
                    background: "var(--color-paper)",
                  }}
                >
                  <div className="mb-3 text-2xl">{item.icon}</div>
                  <h3
                    className="mb-2 font-semibold"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-ink-muted)" }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Core Flow ===== */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p
              className="mb-4 text-center text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-accent)" }}
            >
              コアコンセプト
            </p>
            <h2
              className="mb-3 text-center text-3xl font-medium"
              style={{ fontFamily: "var(--font-display)" }}
            >
              一気通貫の流れ
            </h2>
            <p
              className="mb-12 text-center text-sm"
              style={{ color: "var(--color-ink-faint)" }}
            >
              バックログの仕事を、今日の行動へ変換する
            </p>

            <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-0">
              {/* Step 01 */}
              <div
                className="flex-1 rounded-xl border p-5"
                style={{
                  borderColor: "var(--color-rule)",
                  background: "var(--color-paper-2)",
                }}
              >
                <span
                  className="mb-2 block text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  01
                </span>
                <span
                  className="mb-2 block font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  プロジェクト
                </span>
                <span
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  案件・テーマごとの箱。Inbox に入れておくだけでも OK。
                </span>
              </div>
              <div
                className="flex items-center justify-center py-1 md:px-2 md:py-0"
                style={{ color: "var(--color-ink-faint)" }}
              >
                <span className="md:hidden">↓</span>
                <span className="hidden md:block">→</span>
              </div>

              {/* Step 02 */}
              <div
                className="flex-1 rounded-xl border p-5"
                style={{
                  borderColor: "var(--color-rule)",
                  background: "var(--color-paper-2)",
                }}
              >
                <span
                  className="mb-2 block text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  02
                </span>
                <span
                  className="mb-2 block font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  タスク
                </span>
                <span
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  バックログ。期限・見積もりを持ち、実績が積み上がっていく。
                </span>
              </div>
              <div
                className="flex items-center justify-center py-1 md:px-2 md:py-0"
                style={{ color: "var(--color-ink-faint)" }}
              >
                <span className="md:hidden">↓</span>
                <span className="hidden md:block">→</span>
              </div>

              {/* Step 03 */}
              <div
                className="flex-1 rounded-xl border p-5"
                style={{
                  borderColor: "var(--color-rule)",
                  background: "var(--color-paper-2)",
                }}
              >
                <span
                  className="mb-2 block text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  03
                </span>
                <span
                  className="mb-2 block font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  Todo
                </span>
                <span
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  「今日やる」とコミットした予定。タイムラインへ配置する。
                </span>
              </div>
              <div
                className="flex items-center justify-center py-1 md:px-2 md:py-0"
                style={{ color: "var(--color-ink-faint)" }}
              >
                <span className="md:hidden">↓</span>
                <span className="hidden md:block">→</span>
              </div>

              {/* Step 04 */}
              <div
                className="flex-1 rounded-xl border p-5"
                style={{
                  borderColor: "var(--color-rule)",
                  background: "var(--color-paper-2)",
                }}
              >
                <span
                  className="mb-2 block text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  04
                </span>
                <span
                  className="mb-2 block font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  作業計測
                </span>
                <span
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  実績の本体。開始・停止だけ。タスクに自動集計される。
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Features ===== */}
        <section
          className="px-6 py-20"
          style={{ background: "var(--color-paper-2)" }}
        >
          <div className="mx-auto max-w-4xl">
            <p
              className="mb-4 text-center text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-accent)" }}
            >
              主な機能
            </p>
            <h2
              className="mb-12 text-center text-3xl font-medium"
              style={{ fontFamily: "var(--font-display)" }}
            >
              計画も実績も、ひとつの画面で
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div
                className="rounded-xl border p-6"
                style={{
                  borderColor: "var(--color-rule)",
                  background: "var(--color-paper)",
                }}
              >
                <div
                  className="mb-4 h-1 w-12 rounded-full"
                  style={{ background: "var(--color-plan)" }}
                />
                <h3
                  className="mb-2 font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  計画 vs 実績 タイムライン
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  15分目盛りのタイムラインに計画（点線）と実績（塗り）を重ね表示。
                  「思ったより時間がかかった」が即座に見える。
                </p>
              </div>

              <div
                className="rounded-xl border p-6"
                style={{
                  borderColor: "var(--color-rule)",
                  background: "var(--color-paper)",
                }}
              >
                <div
                  className="mb-4 h-1 w-12 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
                <h3
                  className="mb-2 font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  バックログ → 今日へ
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  バックログのタスクを今日のタイムラインにドラッグ配置。
                  カレンダーを見れば今日やることがすぐわかる。
                </p>
              </div>

              <div
                className="rounded-xl border p-6"
                style={{
                  borderColor: "var(--color-rule)",
                  background: "var(--color-paper)",
                }}
              >
                <div
                  className="mb-4 h-1 w-12 rounded-full"
                  style={{ background: "var(--color-warn)" }}
                />
                <h3
                  className="mb-2 font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  「明日を準備」
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  夕方の振り返りで「明日を準備」を実行。繰越しと定期タスクを
                  翌日カレンダーに仮配置して、朝から動き出せる。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Footer CTA ===== */}
        <section className="px-6 py-28 text-center">
          <h2
            className="mb-4 text-4xl font-medium"
            style={{ fontFamily: "var(--font-display)" }}
          >
            今日から始める
          </h2>
          <p
            className="mx-auto mb-10 max-w-md text-base leading-relaxed"
            style={{ color: "var(--color-ink-muted)" }}
          >
            バックログと今日をつなぐ習慣を、今日から。
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg px-8 py-4 text-base font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-accent-ink)",
            }}
          >
            無料で始める →
          </Link>
          <p
            className="mt-4 text-xs"
            style={{ color: "var(--color-ink-faint)" }}
          >
            メールまたは Google アカウントで登録できます
          </p>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer
        className="border-t px-6 py-6 text-center text-xs"
        style={{
          borderColor: "var(--color-rule)",
          color: "var(--color-ink-faint)",
        }}
      >
        © 2026 タスク＆Todo管理
      </footer>
    </div>
  );
}
