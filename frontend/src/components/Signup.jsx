// frontend/src/components/Signup.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { signup } from "../api/tickets.js";
import { BrandLogo } from "./shared/ui.jsx";

export function Signup() {
    const navigate = useNavigate();
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
            navigate("/", { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[var(--g-100)] flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">

                {/* Logo */}
                <BrandLogo to="/" className="justify-center mb-8 w-full" textClassName="text-xl text-[var(--s)]" />

                {/* Card */}
                <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--g-300)] shadow-[var(--shadow-md)] p-8">
                    <h1 className="text-xl font-bold text-[var(--s)] mb-1">Create your account</h1>
                    <p className="text-sm text-[var(--g-600)] mb-6">Set up your company's support desk.</p>

                    {error && (
                        <div className="mb-5 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--s-mid)]">Company name</label>
                            <input
                                name="company_name"
                                value={form.company_name}
                                onChange={updateField}
                                placeholder="Acme Inc"
                                required
                                className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-[var(--g-100)] text-sm text-[var(--s)] placeholder-[var(--g-500)] outline-none focus:border-[var(--p)] transition"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--s-mid)]">First name</label>
                                <input
                                    name="first_name"
                                    value={form.first_name}
                                    onChange={updateField}
                                    placeholder="John"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-[var(--g-100)] text-sm text-[var(--s)] placeholder-[var(--g-500)] outline-none focus:border-[var(--p)] transition"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--s-mid)]">Last name</label>
                                <input
                                    name="last_name"
                                    value={form.last_name}
                                    onChange={updateField}
                                    placeholder="Doe"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-[var(--g-100)] text-sm text-[var(--s)] placeholder-[var(--g-500)] outline-none focus:border-[var(--p)] transition"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--s-mid)]">Work email</label>
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
                                placeholder="Min. 8 characters"
                                required
                                minLength={8}
                                className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--g-300)] bg-[var(--g-100)] text-sm text-[var(--s)] placeholder-[var(--g-500)] outline-none focus:border-[var(--p)] transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-1 w-full py-2.5 rounded-[var(--radius-md)] bg-[var(--p)] text-white text-sm font-semibold hover:bg-[var(--p-strong)] disabled:opacity-60 disabled:cursor-wait transition"
                        >
                            {isLoading ? "Creating account…" : "Create account"}
                        </button>
                    </form>
                </div>

                {/* Footer link */}
                <p className="text-center text-sm text-[var(--g-600)] mt-5">
                    Already have an account?{" "}
                    <Link to="/login" className="text-[var(--p)] font-semibold hover:underline">
                        Sign in
                    </Link>
                </p>

            </div>
        </div>
    );
}