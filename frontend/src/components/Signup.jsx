import { useState } from "react";
import { signup } from "../api/tickets.js";

export function Signup({ onSignup, onGoToLogin }) {
    const [form, setForm] = useState({
        company_name: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    function updateField(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await signup(form);
            onSignup();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[var(--nexus-color-bg)] flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-[var(--nexus-radius-md)] [background:var(--nexus-gradient-brand)] flex items-center justify-center shadow-[var(--nexus-shadow-md)]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-[var(--nexus-color-text)] tracking-tight">Nexus Support</span>
                </div>

                {/* Card */}
                <div className="bg-[var(--nexus-color-surface)] rounded-[var(--nexus-radius-xl)] border border-[var(--nexus-color-border)] shadow-[var(--nexus-shadow-md)] p-8">
                    <h1 className="text-xl font-bold text-[var(--nexus-color-text)] mb-1">Create your account</h1>
                    <p className="text-sm text-[var(--nexus-color-muted)] mb-6">Set up your company's support desk.</p>

                    {error && (
                        <div className="mb-5 px-4 py-3 rounded-[var(--nexus-radius-md)] bg-[var(--nexus-color-danger-soft)] border border-[var(--nexus-color-danger-soft)] text-[var(--nexus-color-danger)] text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--nexus-color-secondary-strong)]">Company name</label>
                            <input
                                name="company_name"
                                value={form.company_name}
                                onChange={updateField}
                                placeholder="Acme Inc"
                                required
                                className="w-full px-3.5 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)] text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] outline-none focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] transition"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--nexus-color-secondary-strong)]">First name</label>
                                <input
                                    name="first_name"
                                    value={form.first_name}
                                    onChange={updateField}
                                    placeholder="John"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)] text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] outline-none focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] transition"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--nexus-color-secondary-strong)]">Last name</label>
                                <input
                                    name="last_name"
                                    value={form.last_name}
                                    onChange={updateField}
                                    placeholder="Doe"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)] text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] outline-none focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] transition"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--nexus-color-secondary-strong)]">Work email</label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={updateField}
                                placeholder="you@company.com"
                                required
                                className="w-full px-3.5 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)] text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] outline-none focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--nexus-color-secondary-strong)]">Password</label>
                            <input
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={updateField}
                                placeholder="Min. 8 characters"
                                required
                                minLength={8}
                                className="w-full px-3.5 py-2.5 rounded-[var(--nexus-radius-md)] border border-[var(--nexus-color-border)] bg-[var(--nexus-color-surface-muted)] text-sm text-[var(--nexus-color-text)] placeholder-[var(--nexus-color-subtle)] outline-none focus:border-[var(--nexus-color-primary)] focus:ring-2 focus:ring-[var(--nexus-color-primary-soft)] transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-1 w-full py-2.5 rounded-[var(--nexus-radius-md)] [background:var(--nexus-gradient-brand)] text-white text-sm font-bold shadow-[var(--nexus-shadow-sm)] hover:opacity-90 disabled:opacity-60 disabled:cursor-wait transition"
                        >
                            {isLoading ? "Creating account…" : "Create account"}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-[var(--nexus-color-muted)] mt-5">
                    Already have an account?{" "}
                    <button
                        onClick={onGoToLogin}
                        className="text-[var(--nexus-color-primary)] font-semibold hover:underline"
                    >
                        Sign in
                    </button>
                </p>

            </div>
        </div>
    );
}