// frontend/src/pages/WidgetSetupPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getCurrentUser } from "../api/tickets.js";

const WIDGET_URL = import.meta.env.VITE_WIDGET_URL;

export function WidgetSetupPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        getCurrentUser().then(setUser).catch(() => { });
    }, []);

    const embedScript = user
        ? `<script src="${WIDGET_URL}"></script>\n<script>\n  window.addEventListener('load', function () {\n    Resolvio.init({\n      apiKey: "${user.company_api_key}"\n    });\n  });\n</script>`
        : "Loading...";

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(embedScript);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textarea = document.createElement("textarea");
            textarea.value = embedScript;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

            {/* Page header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--s)] tracking-tight mb-1">
                    Widget Setup
                </h1>
                <p className="text-sm text-[var(--g-600)]">
                    Copy the script below and paste it into your website's HTML just before the closing{" "}
                    <code className="bg-[var(--g-200)] text-[var(--s-mid)] px-1.5 py-0.5 rounded text-xs font-mono">
                        &lt;/body&gt;
                    </code>{" "}
                    tag. The chat bubble will appear automatically.
                </p>
            </div>

            {/* API key box */}
            <div className="bg-[var(--g-100)] border border-[var(--g-300)] rounded-[var(--radius-lg)] p-4 mb-6">
                <p className="text-xs font-semibold text-[var(--g-600)] uppercase tracking-wider mb-1">
                    Your API Key
                </p>
                <p className="text-sm font-mono text-[var(--s)] break-all">
                    {user?.company_api_key ?? "Loading..."}
                </p>
                <p className="text-xs text-[var(--g-500)] mt-1">
                    This key is unique to your company. Keep it private.
                </p>
            </div>

            {/* Code block */}
            <div className="bg-[var(--s)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--g-400)]">

                {/* Code block top bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--g-600)]">
                    <span className="text-xs font-medium text-[var(--g-500)]">
                        HTML embed code
                    </span>
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all ${copied
                            ? "bg-[var(--success-soft)] text-[var(--success)]"
                            : "bg-[var(--g-600)] text-white hover:bg-[var(--g-500)]"
                            }`}
                    >
                        {copied ? (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy
                            </>
                        )}
                    </button>
                </div>

                {/* The code itself */}
                <pre className="px-4 py-4 text-sm text-[var(--g-300)] overflow-x-auto leading-relaxed font-mono whitespace-pre">
                    <code>{embedScript}</code>
                </pre>
            </div>

            {/* How to install steps */}
            <div className="mt-8 border border-[var(--g-300)] rounded-[var(--radius-lg)] overflow-hidden">
                <div className="px-4 py-3 bg-[var(--g-100)] border-b border-[var(--g-300)]">
                    <p className="text-xs font-semibold text-[var(--g-600)] uppercase tracking-wider">
                        How to install
                    </p>
                </div>
                {[
                    "Copy the code above using the Copy button.",
                    "Open your website's HTML file or template.",
                    <>Paste the code just before the closing{" "}
                        <code className="bg-[var(--g-200)] text-[var(--s-mid)] px-1 py-0.5 rounded text-xs font-mono">&lt;/body&gt;</code>
                        {" "}tag.</>,
                    "Save and publish. The chat bubble will appear on your site.",
                ].map((text, i) => (
                    <div key={i} className="flex items-start gap-4 px-4 py-3.5 border-b last:border-0 border-[var(--g-300)]">
                        {/* Step number circle — primary green, consistent with app */}
                        <span className="w-6 h-6 rounded-full bg-[var(--p)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                        </span>
                        <p className="text-sm text-[var(--g-600)]">{text}</p>
                    </div>
                ))}
            </div>

            {/* Next step — onboarding flow continues to Support Articles */}
            <div className="mt-8 flex items-center justify-between gap-4 px-5 py-4 rounded-[var(--radius-lg)] bg-[var(--p-soft)] border border-[var(--p)]">
                <div>
                    <p className="text-sm font-semibold text-[var(--s)]">
                        Next, give the AI something to answer from
                    </p>
                    <p className="text-xs text-[var(--g-600)] mt-0.5">
                        Add support articles so your widget can answer real customer questions.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/knowledge-base")}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--p)] text-white text-sm font-semibold hover:bg-[var(--p-strong)] transition flex-shrink-0"
                >
                    Add Support Articles
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </button>
            </div>

        </div>
    );
}