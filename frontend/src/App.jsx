import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardRaw from './pages/DashboardRaw';
import { FieldProvider } from './contexts/FieldContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import LogoReveal from './components/LogoReveal';

export default function App() {
  const [introFinished, setIntroFinished] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('demo');
  React.useEffect(() => {
    fetch(`${API_BASE}/`).then(r=>r.json()).then(d=>setMode(d.mode)).catch(console.error);
  }, [API_BASE]);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  if (!introFinished) {
    return <LogoReveal onComplete={() => setIntroFinished(true)} />;
  }

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, full_name: name })
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
        setError('');
      } else {
        setError(data.detail || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, otp, full_name: name })
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ token: data.token, name: data.user.full_name, ...data.user });
        setError('');
      } else {
        setError(data.detail || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const logout = () => setUser(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050B08] flex items-center justify-center text-white font-body-md p-4">
        <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
          <div className="flex justify-center mb-8">
            <img src="/terra-orbit-logo.png" alt="TerraOrbit" className="w-16 h-16 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.25)]" />
          </div>
          <h2 className="text-3xl font-bold text-center mb-2 tracking-tight">TerraOrbit</h2>
          <p className="text-white/50 text-center text-sm mb-8">Enter your phone number to continue. (Demo OTP: 123456)</p>
          
          {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-xl text-sm">{error}</div>}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#22C55E] uppercase tracking-wider mb-2">Full Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22C55E] focus:outline-none transition-colors" placeholder="e.g. Rahul Kumar" />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#22C55E] uppercase tracking-wider mb-2">Phone Number</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#22C55E] focus:outline-none transition-colors" placeholder="+91 99999 99999" />
              </div>
              <button type="submit" className="w-full bg-[#1F8A4D] hover:bg-[#18703e] text-white py-3.5 rounded-full font-semibold tracking-wide transition-all mt-4">Send Verification Code</button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#38BDF8] uppercase tracking-wider mb-2">Enter OTP</label>
                <input required type="text" value={otp} onChange={e => setOtp(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#38BDF8] focus:outline-none transition-colors text-center tracking-[0.5em] text-xl" placeholder="••••••" maxLength={6} />
              </div>
              <button type="submit" className="w-full bg-[#1F8A4D] hover:bg-[#18703e] text-white py-3.5 rounded-full font-semibold tracking-wide transition-all mt-4">Verify & Login</button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-white/50 hover:text-white text-sm py-2">Use a different number</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ErrorBoundary><FieldProvider><DashboardRaw user={user} onLogout={logout} mode={mode} /></FieldProvider></ErrorBoundary>} />
      </Routes>
    </BrowserRouter>
  );
}
