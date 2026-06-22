// frontend/src/pages/KnowledgeBasePage.jsx

import { useEffect, useState } from "react";
import { createArticle, deleteArticle, listArticles, updateArticle } from "../api/knowledgeBase.js";
import { EmptyState } from "../components/shared/ui.jsx";

function IndexStatusBadge({ status }) {
    const isReady = status === "ready";
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${isReady
                ? "bg-[var(--nexus-color-success-soft)] text-[var(--nexus-color-success)] ring-1 ring-[var(--nexus-color-success-soft)]"
                : "bg-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] ring-1 ring-[var(--nexus-color-danger-soft)]"
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${isReady ? "bg-[var(--nexus-color-success)]" : "bg-[var(--nexus-color-danger)]"}`} />
            {isReady ? "Searchable" : "Failed"}
        </span>
    );
}

const emptyForm = { title: "", body: "" };

export function KnowledgeBasePage() {
    const [articles, setArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState(null); // null = no form, "new" = create, article = edit
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
            } else {
                const updated = await updateArticle(selected.id, form);
                setArticles(prev => prev.map(a => (a.id === updated.id ? updated : a)));
            }
            closeForm();
        } catch (err) {
            setFormError(err.message);
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
        } catch (err) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-7">

            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--nexus-color-primary)] mb-1">AI Layer</p>
                    <h1 className="text-2xl font-bold text-[var(--nexus-color-text)] tracking-tight">Knowledge Base</h1>
                    <p className="text-sm text-[var(--nexus-color-muted)] mt-0.5">Articles here are what the AI uses to answer customers automatically.</p>
                </div>
                <button
                    onClick={startNewArticle}
                    className="px-4 py-2 rounded-[var(--nexus-radius-md)] [background:var(--nexus-gradient-brand)] text-white text-sm font-bold shadow-[var(--nexus-shadow-sm)] hover:opacity-90 transition"
                >
                    + New article
                </button>
            </div>

            {error && (
                <div className="mb-5 px-4 py-3 rounded-[var(--nexus-radius-md)] bg-[var(--nexus-color-danger-soft)] border border-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] text-sm">
                    {error}
                </div>
            )}

            <div className={`grid gap-4 items-start ${selected ? "lg:grid-cols-[1fr_1.1fr]" : "grid-cols-1"}`}>

                <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-[var(--nexus-color-border)] shadow-[var(--nexus-shadow-sm)] overflow-hidden">
                    {isLoading && (
                        <div className="py-10 text-center text-[var(--nexus-color-subtle)] text-sm">Loading articles…</div>
                    )}

                    {!isLoading && articles.length === 0 && (
                        <EmptyState icon="📚" title="No articles yet" body="Add your first article so the AI has something to answer from." />
                    )}

                    {!isLoading && articles.map((article, i) => {
                        const active = selected !== "new" && selected?.id === article.id;
                        return (
                            <button
                                key={article.id}
                                type="button"
                                onClick={() => startEditArticle(article)}
                                className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 transition border-l-2
                  ${i < articles.length - 1 ? "border-b border-[var(--nexus-color-border)]" : ""}
                  ${active ? "bg-[var(--nexus-color-primary-soft)] border-l-[var(--nexus-color-primary)]" : "hover:bg-[var(--nexus-color-surface-muted)] border-l-transparent"}
                `}
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--nexus-color-text)] truncate">{article.title}</p>
                                    <p className="text-xs text-[var(--nexus-color-subtle)] mt-0.5">{new Date(article.updated_at).toLocaleString()}</p>
                                </div>
                                <IndexStatusBadge status={article.index_status} />
                            </button>
                        );
                    })}
                </div>

                {selected && (
                    <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-[var(--nexus-color-border)] shadow-[var(--nexus-shadow-sm)] overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)]">
                            <h2 className="font-bold text-[var(--nexus-color-text)] text-[15px]">
                                {selected === "new" ? "New article" : "Edit article"}
                            </h2>
                            <button onClick={closeForm} className="text-[var(--nexus-color-subtle)] hover:text-[var(--nexus-color-secondary)] text-xl leading-none">×</button>
                        </div>

                        <form onSubmit={submitForm} className="p-5 flex flex-col gap-4">
                            {selected !== "new" && selected.index_status === "failed" && (
                                <div className="px-3 py-2.5 rounded-[var(--nexus-radius-md)] bg-[var(--nexus-color-danger-soft)] border border-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] text-xs">
                                    ⚠️ Not searchable yet. {selected.index_error || "Saving again will retry."}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--nexus-color-secondary-strong)]">Title</label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="Refund Policy"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)] text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] outline-none focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] transition"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--nexus-color-secondary-strong)]">Body</label>
                                <textarea
                                    value={form.body}
                                    onChange={e => setForm({ ...form, body: e.target.value })}
                                    rows={10}
                                    required
                                    placeholder="Write the policy or FAQ content here…"
                                    className="w-full px-3.5 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)] text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] outline-none resize-y leading-relaxed focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] transition"
                                />
                            </div>

                            {formError && (
                                <div className="px-3 py-2 rounded-[var(--nexus-radius-md)] bg-[var(--nexus-color-danger-soft)] border border-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] text-xs">
                                    {formError}
                                </div>
                            )}

                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 rounded-[var(--nexus-radius-md)] [background:var(--nexus-gradient-brand)] text-white text-sm font-bold shadow-[var(--nexus-shadow-sm)] hover:opacity-90 disabled:opacity-60 disabled:cursor-wait transition"
                                >
                                    {isSubmitting ? "Saving…" : "Save article"}
                                </button>
                                {selected !== "new" && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={isSubmitting}
                                        className="px-4 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] text-sm font-bold hover:bg-[var(--nexus-color-danger-soft)] disabled:opacity-60 transition"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}