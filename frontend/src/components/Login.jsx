// frontend/src/components/Login.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { login } from "../api/tickets.js";
import { BrandLogo } from "./shared/ui.jsx";

export function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
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
            await login(form);
            navigate("/", { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[var(--g-100)] flex items-center justify-center px-4">
            <div className="w-full max-w-md">

                {/* Logo */}
                <BrandLogo to="/" className="justify-center mb-8 w-full" textClassName="text-xl text-[var(--s)]" />

                {/* Card */}
                <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-md)] p-8">
                    <h1 className="text-xl font-bold text-[var(--s)] mb-1">Welcome back</h1>
                    <p className="text-sm text-[var(--g-600)] mb-6">Sign in to your agent dashboard.</p>

                    {error && (
                        <div className="mb-5 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--s-mid)]">Email</label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={updateField}
                                placeholder="you@company.com"
                                required
                                className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-[var(--g-100)] text-sm text-[var(--s)] placeholder-[var(--g-500)] outline-none focus:border-[var(--p)] transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--s-mid)]">Password</label>
                            <input
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={updateField}
                                placeholder="••••••••"
                                required
                                className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-[var(--g-100)] text-sm text-[var(--s)] placeholder-[var(--g-500)] outline-none focus:border-[var(--p)] transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-1 w-full py-2.5 rounded-[var(--radius-md)] bg-[var(--p)] text-white text-sm font-semibold hover:bg-[var(--p-strong)] disabled:opacity-60 disabled:cursor-wait transition"
                        >
                            {isLoading ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                </div>

                {/* Footer link */}
                <p className="text-center text-sm text-[var(--g-600)] mt-5">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-[var(--p)] font-semibold hover:underline">
                        Create one
                    </Link>
                </p>

            </div>
        </div>
    );
}