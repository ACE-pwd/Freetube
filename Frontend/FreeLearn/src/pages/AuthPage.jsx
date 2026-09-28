import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser, signupUser } from '../api';
import './Auth.css';

export default function AuthPage({ signup = false }) {
    const [params] = useSearchParams();
    const next = params.get('next');
    const destination = /^\/courses(?:\/[A-Za-z0-9-]+)?$/.test(next || '') ? next : '/dashboard';
    const suffix = destination.startsWith('/courses') ? `?next=${encodeURIComponent(destination)}` : '';
    const [name, setName] = useState(''); const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
    const [visible, setVisible] = useState(false); const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(''); const [success, setSuccess] = useState(false);
    async function submit(event) {
        event.preventDefault(); if (loading) return;
        setMessage(''); setSuccess(false);
        if (signup && !name.trim()) { setMessage('Please enter your name.'); return; }
        if (signup && password !== confirm) { setMessage('Your passwords do not match.'); return; }
        if (new TextEncoder().encode(password).length > 72) { setMessage('Please use a password of up to 72 bytes.'); return; }
        setLoading(true);
        try {
            const data = signup ? await signupUser(name.trim(), email.trim(), password) : await loginUser(email.trim(), password);
            if (signup && data.user) { setSuccess(true); setPassword(''); setConfirm(''); setMessage('Your account is ready. Log in to start learning.'); }
            else if (!signup && data.token) {
                localStorage.setItem('token', data.token); localStorage.setItem('email', data.email);
                window.location.assign(destination);
            } else setMessage(data.message || 'Something went wrong. Please try again.');
        } catch { setMessage('Unable to connect. Please try again.'); }
        finally { setLoading(false); }
    }
    return <div className="auth-shell">
        <aside className="auth-story"><div className="auth-brand"><BookOpen size={26} /> FreeLearn</div><span className="auth-eyebrow">A LITTLE CURIOSITY. A NEW SKILL.</span><h2>Make time for<br />what inspires you.</h2><p>From your first brush stroke to your first website, follow a clear path and learn at your own pace.</p><ul><li><CheckCircle size={18} /> Free lessons, thoughtfully arranged</li><li><CheckCircle size={18} /> Practice that turns into progress</li><li><CheckCircle size={18} /> Pick up where you left off</li></ul><div className="auth-skill-tags"><span>Calligraphy</span><span>Piano</span><span>Web development</span><span>Terminal basics</span></div></aside>
        <section className="auth-panel"><Link className="auth-back" to="/courses">← Explore courses</Link><div className="auth-heading"><h1>{signup ? 'Start your learning journey' : 'Welcome back'}</h1><p>{signup ? 'Create your free account. Your next skill starts here.' : 'Log in to continue learning something you love.'}</p></div>
            {message && <div className={`auth-notice ${success ? 'auth-success' : 'auth-error'}`} role={success ? 'status' : 'alert'}>{message}</div>}
            {success ? <Link className="btn btn-primary auth-submit" to={`/login${suffix}`}>Continue to login <ArrowRight size={18} /></Link> : <form className="auth-form" onSubmit={submit} aria-busy={loading}>
                <fieldset disabled={loading}>
                    {signup && <label htmlFor="auth-name">Full name<input id="auth-name" name="name" autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>}
                    <label htmlFor="auth-email">Email address<input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                    <label htmlFor="auth-password">Password</label><div className="auth-password"><input id="auth-password" name="password" type={visible ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} aria-describedby={signup ? 'password-hint' : undefined} placeholder={signup ? 'Create a strong password' : 'Enter your password'} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
                    {signup && <><small id="password-hint">Use at least 8 characters.</small><label htmlFor="auth-confirm">Confirm password<input id="auth-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Enter your password again" /></label></>}
                    <button className="btn btn-primary auth-submit" type="submit">{loading ? (signup ? 'Creating account...' : 'Logging in...') : (signup ? 'Create free account' : 'Log in')} {!loading && <ArrowRight size={18} />}</button>
                </fieldset>
            </form>}
            <p className="auth-switch">{signup ? 'Already have an account?' : 'New to FreeLearn?'} <Link to={`${signup ? '/login' : '/signup'}${suffix}`}>{signup ? 'Log in' : 'Create an account'}</Link></p><p className="auth-footnote">Learning is free. Some skills may require your own materials or equipment.</p>
        </section>
    </div>;
}
