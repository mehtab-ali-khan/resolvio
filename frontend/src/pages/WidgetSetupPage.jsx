// frontend/src/pages/WidgetSetupPage.jsx

import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/tickets.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WIDGET_URL = import.meta.env.VITE_WIDGET_URL || "http://localhost:8080/widget.js";

export function WidgetSetupPage() {
    const [user, setUser] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        getCurrentUser().then(setUser).catch(() => { });
    }, []);

    // Build the exact script the customer needs to paste into their website.
    // We fill in their real api_key automatically so they don't have to
    // find it themselves.
    const embedScript = user
        ? `<script src="${WIDGET_URL}"></script>
<script>
  window.addEventListener('load', function () {
    NexusSupport.init({
      apiKey: "${user.company_api_key}"
    });
  });
</script>`
        : "Loading...";

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(embedScript);
            setCopied(true);
            // Reset the "Copied!" confirmation after 2 seconds
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for browsers that block clipboard access
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
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                    Widget Setup
                </h1>
                <p className="text-sm text-gray-500">
                    Paste this script into your website's HTML, just before the closing{" "}
                    <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">
                        &lt;/body&gt;
                    </code>{" "}
                    tag. The chat widget will appear automatically.
                </p>
            </div>

            {/* Your API key info box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Your API Key
                </p>
                <p className="text-sm font-mono text-gray-800 break-all">
                    {user?.company_api_key ?? "Loading..."}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    This key is unique to your company. Keep it private — anyone with this key can submit tickets on your behalf.
                </p>
            </div>

            {/* Code block */}
            <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">

                {/* Code block header bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <span className="text-xs font-medium text-gray-400">
                        HTML embed code
                    </span>
                    <button
                        onClick={handleCopy}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                            transition-all duration-150
                            ${copied
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                            }
                        `}
                    >
                        {copied ? (
                            <>
                                {/* Checkmark icon */}
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                {/* Copy icon */}
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy
                            </>
                        )}
                    </button>
                </div>

                {/* The actual code */}
                <pre className="px-4 py-4 text-sm text-gray-300 overflow-x-auto leading-relaxed">
                    <code>{embedScript}</code>
                </pre>
            </div>

            {/* Simple steps below the code */}
            <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        How to install
                    </p>
                </div>
                {[
                    { step: "1", text: "Copy the code above using the Copy button." },
                    { step: "2", text: "Open your website's HTML file or template." },
                    { step: "3", text: "Paste the code just before the closing </body> tag." },
                    { step: "4", text: "Save and publish. The chat bubble will appear on your site." },
                ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-4 px-4 py-3.5 border-b last:border-0 border-gray-100">
                        <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {step}
                        </span>
                        <p className="text-sm text-gray-600">{step === "3" ? (
                            <>
                                Paste the code just before the closing{" "}
                                <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-xs font-mono">
                                    &lt;/body&gt;
                                </code>{" "}
                                tag.
                            </>
                        ) : text}</p>
                    </div>
                ))}
            </div>

        </div>
    );
}