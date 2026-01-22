import React, { useState, useEffect } from 'react';
import { Mail, Check, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailIntegration {
    id: string;
    provider: 'gmail' | 'outlook' | 'other';
    imap_host: string;
    imap_port: number;
    imap_user: string;
    status: 'active' | 'error' | 'disconnected';
    last_synced_at: string | null;
    last_error: string | null;
}

export const EmailIntegrationSettings: React.FC = () => {
    const [integrations, setIntegrations] = useState<EmailIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [provider, setProvider] = useState<'gmail' | 'outlook' | 'other'>('gmail');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [host, setHost] = useState('imap.gmail.com');
    const [port, setPort] = useState(993);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const fetchIntegrations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Should be handled by listener, but safe check

            const { data, error } = await supabase
                .from('email_integrations')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            setIntegrations(data || []);
        } catch (err: any) {
            console.error('Error fetching integrations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProviderChange = (p: 'gmail' | 'outlook' | 'other') => {
        setProvider(p);
        if (p === 'gmail') {
            setHost('imap.gmail.com');
            setPort(993);
        } else if (p === 'outlook') {
            setHost('outlook.office365.com');
            setPort(993);
        } else {
            setHost('');
            setPort(993);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Call the encryption API server (keeps encryption key server-side)
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

            const response = await fetch(`${API_URL}/api/email-integration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.id,
                    email,
                    password,
                    host,
                    port,
                    provider
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to save integration');
            }

            setShowForm(false);
            setEmail('');
            setPassword('');
            fetchIntegrations();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Stop monitoring this email?")) return;

        try {
            await supabase.from('email_integrations').delete().eq('id', id);
            fetchIntegrations();
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>;

    return (
        <section className="bg-white border-2 border-charcoal p-6 shadow-[6px_6px_0px_#1A1E1C]">
            <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-100 pb-4">
                <div className="p-2 bg-charcoal border border-charcoal">
                    <Mail className="w-5 h-5 text-lime" />
                </div>
                <h3 className="text-lg font-bold">Email Integration (AI Agent)</h3>
            </div>

            {/* List of Active Integrations */}
            {integrations.length > 0 && (
                <div className="mb-6 space-y-3">
                    {integrations.map(integ => (
                        <div key={integ.id} className="flex items-center justify-between p-3 bg-cream border border-charcoal">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${integ.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <div>
                                    <p className="font-bold text-sm">{integ.imap_user}</p>
                                    <p className="text-xs text-gray-500">{integ.imap_host}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {integ.status === 'error' && (
                                    <span className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Auth Failed
                                    </span>
                                )}
                                <button onClick={() => handleDelete(integ.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add New Integration Form */}
            {!showForm ? (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full py-3 border-2 border-dashed border-charcoal hover:bg-gray-50 font-bold text-charcoal"
                >
                    + Connect New Email Account
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 border border-charcoal space-y-4">
                    <h4 className="font-bold mb-4">Connect Email Account</h4>

                    <div>
                        <label className="block text-sm font-bold mb-1">Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => handleProviderChange(e.target.value as any)}
                            className="w-full p-2 border border-charcoal"
                        >
                            <option value="gmail">Gmail</option>
                            <option value="outlook">Outlook / Office 365</option>
                            <option value="other">Other (Custom IMAP)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">IMAP Host</label>
                            <input
                                type="text"
                                value={host}
                                onChange={e => setHost(e.target.value)}
                                disabled={provider !== 'other'}
                                className="w-full p-2 border border-charcoal disabled:bg-gray-200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Port</label>
                            <input
                                type="number"
                                value={port}
                                onChange={e => setPort(Number(e.target.value))}
                                disabled={provider !== 'other'}
                                className="w-full p-2 border border-charcoal disabled:bg-gray-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-2 border border-charcoal"
                            placeholder="procurement@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">
                            {provider === 'gmail' ? 'App Password' : 'Password'}
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-2 border border-charcoal"
                            placeholder="••••••••••••"
                        />
                        {provider === 'gmail' && (
                            <p className="text-xs text-gray-500 mt-1">
                                For Gmail, you must use an <a href="https://support.google.com/accounts/answer/185833" target="_blank" className="underline text-blue-600">App Password</a> if 2FA is enabled.
                            </p>
                        )}
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex gap-2 justify-end mt-4">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 text-sm underline"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-black text-white font-bold hover:bg-gray-800 disabled:opacity-50"
                        >
                            {submitting ? 'Connecting...' : 'Save & Connect'}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
};
