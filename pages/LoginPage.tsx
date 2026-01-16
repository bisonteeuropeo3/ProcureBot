import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowRight, Loader2 } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.session) {
                    navigate('/dashboard');
                } else if (data.user) {
                    setMessage("Registration successful! Please check your email to confirm your account.");
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-[#FDFCF8] text-[#1A1E1C] font-sans">
             {/* Styles (reusing some global variables via inline style) */}
             <style>{`
                .brutal-border {
                    border: 2px solid #1A1E1C;
                    box-shadow: 4px 4px 0px #1A1E1C;
                    transition: all 0.2s ease;
                }
                .brutal-btn {
                    background-color: #2D4A3E;
                    color: white;
                    border: 2px solid #1A1E1C;
                    box-shadow: 4px 4px 0px #1A1E1C;
                    transition: all 0.2s ease;
                }
                .brutal-btn:hover {
                    background-color: #1A1E1C;
                    transform: translate(-1px, -1px);
                    box-shadow: 5px 5px 0px #D4E768;
                }
                .link-toggle {
                    color: #2D4A3E;
                    font-weight: bold;
                    text-decoration: underline;
                    cursor: pointer;
                }
             `}</style>

            <div className="w-full max-w-md p-8 bg-white brutal-border">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 bg-[#2D4A3E] flex items-center justify-center border border-[#1A1E1C]">
                        <Bot className="text-[#D4E768] w-6 h-6" />
                    </div>
                    <span className="font-bold text-2xl tracking-tight text-[#1A1E1C]">ProcureBot</span>
                </div>

                <h2 className="text-2xl font-bold mb-6 text-center">{isSignUp ? 'Create Account' : 'Login'}</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-500 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-500 text-green-700 text-sm">
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold mb-2">Email</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border-2 border-[#1A1E1C] focus:outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
                            placeholder="admin@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Password</label>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border-2 border-[#1A1E1C] focus:outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
                            placeholder="********"
                            minLength={6}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full brutal-btn py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>{isSignUp ? 'Sign Up' : 'Sign In'} <ArrowRight size={18} /></>}
                    </button>
                </form>

                 <div className="mt-6 text-center text-sm text-gray-500 space-y-2">
                    <p>
                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                        <button onClick={() => setIsSignUp(!isSignUp)} className="link-toggle">
                            {isSignUp ? "Login" : "Sign Up"}
                        </button>
                    </p>
                    <a href="/" className="hover:underline block mt-4">Back to Home</a>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
