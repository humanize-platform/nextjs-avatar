"use client";

import { useState } from 'react';

export default function SubscribePage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            setStatus('success');
        } catch (error: any) {
            console.error('Subscription error:', error);
            setStatus('error');
            setErrorMessage(error.message);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (status === 'success') {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-['Inter']">
                <div className="max-w-md w-full bg-white border border-slate-100 p-10 rounded-3xl shadow-xl text-center">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-blue-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">You're In!</h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        Thank you for subscribing, <br /> <span className="text-slate-900 font-medium">{formData.name}</span>.

                    </p>
                    <div className="mt-8 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <p className="text-blue-700 font-medium">
                            Check your email for the AI news link coming soon.
                        </p>
                    </div>
                    <div className="mt-8 text-sm text-slate-400">
                        Brought to you by <a href="https://humanizetech.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">humanize</a>
                    </div>
                    <button
                        onClick={() => setStatus('idle')}
                        className="mt-6 text-slate-400 hover:text-slate-600 font-medium transition-colors"
                    >
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden font-['Inter']">


            <div className="max-w-lg w-full bg-white border border-slate-100 p-8 sm:p-12 rounded-3xl shadow-xl shadow-slate-200/50 relative z-10 transition-all hover:shadow-2xl hover:shadow-slate-200/60">
                <div className="mb-8 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">Your AI Brief</h3>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        Curated AI news with a human touch.
                    </p>
                </div>

                <div className="h-px bg-slate-200 w-full mb-10" />

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex justify-center w-full">
                        <div className="flex flex-col gap-3 w-10/12">
                            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 ml-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 text-lg text-slate-900 placeholder-slate-400 outline-none ring-offset-0 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 ease-out"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center w-full">
                        <div className="flex flex-col gap-3 w-10/12">
                            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 ml-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="john@example.com"
                                className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 text-lg text-slate-900 placeholder-slate-400 outline-none ring-offset-0 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 ease-out"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center w-full">
                        <div className="flex flex-col gap-3 w-10/12">
                            <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 ml-2">
                                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 (555) 000-0000"
                                className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 text-lg text-slate-900 placeholder-slate-400 outline-none ring-offset-0 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 ease-out"
                            />
                        </div>
                    </div>

                    {status === 'error' && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium text-center border border-red-100">
                            {errorMessage}
                        </div>
                    )}

                    <div className="flex justify-center w-full mt-6">
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-10/12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg py-5 rounded-2xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:grayscale transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.99]"
                        >
                            {status === 'loading' ? (
                                <span className="flex items-center justify-center gap-3">
                                    <svg className="animate-spin h-5 w-5 text-white/90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Get Access Now'
                            )}
                        </button>
                    </div>

                    <div className="h-px bg-slate-200 w-full mt-6 mb-2" />

                    <p className="text-xs text-center text-slate-400 mt-2 leading-relaxed px-4">
                        By submitting this form, you acknowledge that you will receive a curated AI news link delivered directly to your inbox.
                    </p>
                </form>

                <div className="mt-10 text-center text-sm text-slate-500">
                    <span className="opacity-75">Brought to you by</span> <a href="https://humanizetech.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">humanize</a>
                </div>
            </div>
        </main>
    );
}
