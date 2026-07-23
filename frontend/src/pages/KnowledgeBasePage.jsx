// frontend/src/pages/KnowledgeBasePage.jsx

import { useEffect, useState } from "react";
import { createArticle, deleteArticle, listArticles, updateArticle } from "../api/knowledgeBase.js";
import { EmptyState, formatDateTime } from "../components/shared/ui.jsx";

const TEST_WEBSITE_URL = import.meta.env.VITE_TEST_WEBSITE_URL;

function IndexStatusBadge({ status }) {
    const isReady = status === "ready";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${isReady
            ? "bg-[var(--p-soft)] text-[var(--p)]"
            : "bg-[var(--danger-soft)] text-[var(--danger)]"
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isReady ? "bg-[var(--p)]" : "bg-[var(--danger)]"}`} />
            {isReady ? "Success" : "Failed"}
        </span>
    );
}

const emptyForm = { title: "", body: "" };

export function KnowledgeBasePage() {
    const [articles, setArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    async function loadArticles() {
        setError("");
        setIsLoading(true);
        try {
            const data = await listArticles();
            setArticles(data.results);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => { loadArticles(); }, []);

    function startNewArticle() {
        setSelected("new");
        setForm(emptyForm);
        setFormError("");
    }

    function startEditArticle(article) {
        setSelected(article);
        setForm({ title: article.title, body: article.body });
        setFormError("");
    }

    function closeForm() {
        setSelected(null);
        setForm(emptyForm);
        setFormError("");
    }

    async function submitForm(e) {
        e.preventDefault();
        setFormError("");
        setIsSubmitting(true);
        try {
            if (selected === "new") {
                const created = await createArticle(form);
                setArticles(prev => [created, ...prev]);
                closeForm();
            } else {
                const updated = await updateArticle(selected.id, form);
                setArticles(prev => prev.map(a => (a.id === updated.id ? updated : a)));
                setSelected(updated);
                setForm({ title: updated.title, body: updated.body });
            }
        } catch {
            setFormError("Could not save the article. Please check your inputs and try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (selected === "new" || !selected) return;
        if (!window.confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
        setIsSubmitting(true);
        try {
            await deleteArticle(selected.id);
            setArticles(prev => prev.filter(a => a.id !== selected.id));
            closeForm();
        } catch {
            setFormError("Could not delete the article. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-7">

            {/* Page header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--s)] tracking-tight">
                        Support Articles
                    </h1>
                    <p className="text-sm text-[var(--g-600)] mt-0.5">
                        Write articles here — the AI reads them to answer customers automatically.
                    </p>
                </div>
                <button
                    onClick={startNewArticle}
                    className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--p)] text-white text-sm font-semibold hover:bg-[var(--p-strong)] transition"
                >
                    + New article
                </button>
            </div>

            {/* Page-level error */}
            {error && (
                <div className="mb-5 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm">
                    {error}
                </div>
            )}

            <div className={`grid gap-4 items-start ${selected ? "lg:grid-cols-[1fr_1.1fr]" : "grid-cols-1"}`}>

                {/* Article list */}
                <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-sm)] overflow-hidden">
                    {isLoading && (
                        <div className="py-10 text-center text-[var(--g-500)] text-sm">
                            Loading articles…
                        </div>
                    )}

                    {!isLoading && articles.length === 0 && (
                        <EmptyState
                            title="No articles yet"
                            body="Write your first article so the AI has something to answer from."
                        />
                    )}

                    {!isLoading && articles.map((article, i) => {
                        const active = selected !== "new" && selected?.id === article.id;
                        return (
                            <button
                                key={article.id}
                                type="button"
                                onClick={() => startEditArticle(article)}
                                className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 transition border-l-2
                                    ${i < articles.length - 1 ? "border-b border-[var(--g-300)]" : ""}
                                    ${active
                                        ? "bg-[var(--p-soft)] border-l-[var(--p)]"
                                        : "hover:bg-[var(--g-100)] border-l-transparent"
                                    }`}
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--s)] truncate">
                                        {article.title}
                                    </p>
                                    <p className="text-xs text-[var(--g-500)] mt-0.5">
                                        {formatDateTime(article.created_at)}
                                    </p>
                                </div>
                                <IndexStatusBadge status={article.index_status} />
                            </button>
                        );
                    })}
                </div>

                {/* Edit / create form */}
                {selected && (
                    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-sm)] overflow-hidden">

                        {/* Form header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--g-300)] bg-[var(--g-100)]">
                            <h2 className="font-semibold text-[var(--s)] text-sm">
                                {selected === "new" ? "New article" : "Edit article"}
                            </h2>
                            <button
                                onClick={closeForm}
                                className="text-[var(--g-500)] hover:text-[var(--s)] text-xl leading-none p-1 rounded hover:bg-[var(--g-200)] transition"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={submitForm} className="p-5 flex flex-col gap-4">

                            {/* Friendly indexing warning — yellow, not red */}
                            {selected !== "new" && selected.index_status === "failed" && (
                                <div className="px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--warning-soft)] text-[var(--warning)] text-xs">
                                    ⚠️ {selected.index_error || "This article is saved but not yet searchable by the AI. Try saving again."}
                                </div>
                            )}

                            {/* Title */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--s-mid)]">
                                    Title
                                </label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Refund Policy"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-[var(--g-100)] text-sm text-[var(--s)] placeholder-[var(--g-500)] outline-none focus:border-[var(--p)] transition"
                                />
                            </div>

                            {/* Body */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--s-mid)]">
                                    Content
                                </label>
                                <textarea
                                    value={form.body}
                                    onChange={e => setForm({ ...form, body: e.target.value })}
                                    rows={10}
                                    required
                                    placeholder="Write your policy, FAQ, or guide here…"
                                    className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-[var(--g-100)] text-sm text-[var(--s)] placeholder-[var(--g-500)] outline-none resize-y leading-relaxed focus:border-[var(--p)] transition"
                                />
                            </div>

                            {/* Form error */}
                            {formError && (
                                <p className="text-xs text-[var(--danger)]">{formError}</p>
                            )}

                            {/* Buttons */}
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 rounded-[var(--radius-md)] bg-[var(--p)] text-white text-sm font-semibold hover:bg-[var(--p-strong)] disabled:opacity-60 disabled:cursor-wait transition"
                                >
                                    {isSubmitting ? "Saving…" : "Save article"}
                                </button>
                                {selected !== "new" && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={isSubmitting}
                                        className="px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--danger-soft)] text-[var(--danger)] text-sm font-semibold hover:bg-[var(--danger-soft)] disabled:opacity-60 transition"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Next step — onboarding flow continues to testing the widget */}
            {!isLoading && articles.length == 0 && (
                <div className="mt-6 flex items-center justify-between gap-4 px-5 py-4 rounded-[var(--radius-lg)] bg-[var(--p-soft)] border border-[var(--p)]">
                    <div>
                        <p className="text-sm font-semibold text-[var(--s)]">
                            Haven't added your articles yet?
                        </p>
                        <p className="text-xs text-[var(--g-600)] mt-0.5">
                            Try the demo widget below to see how it works, then come back here and add your own documents so the AI can answer using your real content.
                        </p>
                    </div>
                    <a
                        href={TEST_WEBSITE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--p)] text-white text-sm font-semibold hover:bg-[var(--p-strong)] transition flex-shrink-0"
                    >
                        Test The Widget
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                    </a>
                </div>
            )
            }
        </div >
    );
}