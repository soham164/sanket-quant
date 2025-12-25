import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Activity, Brain, Users, Mic, Camera, LogOut, Bell, Send, MapPin, ChevronRight, Radio, Zap, Shield } from 'lucide-react';
import { auth, signInWithGooglePopup, signOutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import LeafletMap from './components/LeafletMap';
import CameraCapture from './components/CameraCapture';
import OfflineIndicator from './components/OfflineIndicator';
import NotificationBanner from './components/NotificationBanner';
import { DashboardSkeleton, VillageCardSkeleton, CommunicationSkeleton } from './components/SkeletonLoaders';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { useOfflineQueue } from './hooks/useOfflineQueue';

const API_BASE = 'http://localhost:8000';

const OFFICIAL_WHITELIST = new Set([
  'soham.pethkar1710@gmail.com',
  'dcharshvardhanpondkule@gmail.com',
]);

const api = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },
  async post(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },
  async postForm(endpoint, formData) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

// Status indicator component
const StatusDot = ({ status, size = 'sm' }) => {
  const colors = {
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
    warning: 'bg-amber-500',
  };
  const sizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };
  return (
    <span className={`${sizes[size]} ${colors[status]} rounded-full inline-block ${status === 'online' ? 'pulse-subtle' : ''}`} />
  );
};

const SanketApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    const enforceOfficialGuard = async () => {
      if (currentUser?.role === 'official') {
        const email = (currentUser.email || '').toLowerCase();
        if (!OFFICIAL_WHITELIST.has(email)) {
          try { await signOutUser(); } catch (_) {}
          localStorage.removeItem('sanket_user');
          setCurrentUser(null);
          setShowLogin(true);
        }
      }
    };
    enforceOfficialGuard();
  }, [currentUser]);

  useEffect(() => {
    const savedUser = localStorage.getItem('sanket_user');
    if (savedUser) { setCurrentUser(JSON.parse(savedUser)); setShowLogin(false); }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const storedRaw = localStorage.getItem('sanket_user');
        if (!storedRaw) { setShowLogin(true); return; }
        const stored = JSON.parse(storedRaw || '{}');
        const requestedOfficial = stored.role === 'official';
        const email = (fbUser.email || '').toLowerCase();
        if (requestedOfficial && !OFFICIAL_WHITELIST.has(email)) {
          try { await signOutUser(); } catch (_) {}
          localStorage.removeItem('sanket_user');
          localStorage.setItem('unauthorized_official', '1');
          setCurrentUser(null);
          setShowLogin(true);
          return;
        }
        const desiredRole = requestedOfficial ? 'official' : 'asha';
        const mapped = { id: fbUser.uid, name: fbUser.displayName || fbUser.email || 'User', email: fbUser.email || '', role: desiredRole };
        setCurrentUser(mapped);
        localStorage.setItem('sanket_user', JSON.stringify(mapped));
        setShowLogin(false);
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = (user) => { setCurrentUser(user); localStorage.setItem('sanket_user', JSON.stringify(user)); setShowLogin(false); };
  const handleLogout = async () => { try { await signOutUser(); } catch (_) {} setCurrentUser(null); localStorage.removeItem('sanket_user'); setShowLogin(true); };

  if (showLogin) return <ErrorBoundary><LoginPage onLogin={handleLogin} /></ErrorBoundary>;
  if (currentUser?.role === 'official') {
    if (!OFFICIAL_WHITELIST.has((currentUser.email || '').toLowerCase())) {
      return <ErrorBoundary><ASHAInterface user={{ ...currentUser, role: 'asha' }} onLogout={handleLogout} /></ErrorBoundary>;
    }
    return <ErrorBoundary><OfficialDashboard user={currentUser} onLogout={handleLogout} /></ErrorBoundary>;
  }
  if (currentUser?.role === 'asha') return <ErrorBoundary><ASHAInterface user={currentUser} onLogout={handleLogout} /></ErrorBoundary>;
  return <ErrorBoundary><LoginPage onLogin={handleLogin} /></ErrorBoundary>;
};

const LoginPage = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState('asha');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', village: '', phone: '' });
  const [warnUnauthorizedOfficial, setWarnUnauthorizedOfficial] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('unauthorized_official') === '1') {
      setWarnUnauthorizedOfficial(true);
      localStorage.removeItem('unauthorized_official');
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailLower = (formData.email || '').toLowerCase();
    if (role === 'official' && !OFFICIAL_WHITELIST.has(emailLower)) {
      localStorage.setItem('unauthorized_official', '1');
      setWarnUnauthorizedOfficial(true);
      return;
    }
    onLogin({ id: Math.random().toString(36).substring(2, 11), name: formData.name, email: formData.email, role, village: formData.village, phone: formData.phone });
  };

  const demoLogin = (demoRole) => {
    const demoUsers = {
      asha: { id: 'asha_001', name: 'Priya Sharma', email: 'priya@asha.gov.in', role: 'asha', village: 'Dharavi', phone: '+91 98765 43210' },
      asha_kalyan: { id: 'asha_002', name: 'Sunita Patil', email: 'sunita@asha.gov.in', role: 'asha', village: 'Kalyan', phone: '+91 98765 43211' },
      asha_thane: { id: 'asha_003', name: 'Meera Desai', email: 'meera@asha.gov.in', role: 'asha', village: 'Thane', phone: '+91 98765 43212' },
      asha_navi: { id: 'asha_004', name: 'Rekha Singh', email: 'rekha@asha.gov.in', role: 'asha', village: 'Navi Mumbai', phone: '+91 98765 43213' },
      official: { id: 'official_001', name: 'Dr. Rajesh Kumar', email: 'rajesh@health.gov.in', role: 'official', district: 'Mumbai', designation: 'District Health Officer' }
    };
    onLogin(demoUsers[demoRole]);
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithGooglePopup();
      const fbUser = cred.user;
      const emailLower = (fbUser.email || '').toLowerCase();
      if (role === 'official' && !OFFICIAL_WHITELIST.has(emailLower)) {
        await signOutUser();
        localStorage.setItem('unauthorized_official', '1');
        setWarnUnauthorizedOfficial(true);
        return;
      }
      onLogin({ id: fbUser.uid, name: fbUser.displayName || 'User', email: fbUser.email || '', role, village: formData.village, phone: formData.phone });
    } catch (e) {
      console.error('Google Sign-In failed:', e);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded mb-4">
            <Activity className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Sanket</h1>
          <p className="text-sm text-text-muted mt-1">Quantum-Enhanced Epidemiology Network</p>
        </div>

        <div className="card p-6">
          {warnUnauthorizedOfficial && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              This email is not authorized as Health Official.
            </div>
          )}

          {/* Role selector */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setRole('asha')} 
              className={`flex-1 py-2.5 text-sm font-medium rounded transition-colors ${role === 'asha' ? 'bg-primary text-text-inverse' : 'bg-surface-200 text-text-secondary hover:bg-surface-300'}`}
            >
              ASHA Worker
            </button>
            <button 
              onClick={() => setRole('official')} 
              className={`flex-1 py-2.5 text-sm font-medium rounded transition-colors ${role === 'official' ? 'bg-primary text-text-inverse' : 'bg-surface-200 text-text-secondary hover:bg-surface-300'}`}
            >
              Health Official
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <input type="text" placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input" required />
            )}
            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input" required />
            <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input" required />
            {isSignup && role === 'asha' && (
              <>
                <input type="text" placeholder="Village Name" value={formData.village} onChange={(e) => setFormData({...formData, village: e.target.value})} className="input" required />
                <input type="tel" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input" required />
              </>
            )}
            <button type="submit" className="w-full btn btn-primary py-2.5">
              {isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-text-muted">or continue with</span></div>
          </div>

          <button onClick={loginWithGoogle} className="w-full btn btn-outline py-2.5">
            Continue with Google
          </button>

          <p className="mt-4 text-center text-sm text-text-muted">
            <button onClick={() => setIsSignup(!isSignup)} className="text-accent hover:underline">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
            </button>
          </p>

          {/* Demo access */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-text-muted text-center mb-3 uppercase tracking-wider">Demo Access</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => demoLogin('asha')} className="btn btn-ghost text-xs py-2">Dharavi</button>
              <button onClick={() => demoLogin('asha_kalyan')} className="btn btn-ghost text-xs py-2">Kalyan</button>
              <button onClick={() => demoLogin('asha_thane')} className="btn btn-ghost text-xs py-2">Thane</button>
              <button onClick={() => demoLogin('asha_navi')} className="btn btn-ghost text-xs py-2">Navi Mumbai</button>
            </div>
            <button onClick={() => demoLogin('official')} className="w-full mt-2 btn btn-ghost text-xs py-2">Health Official</button>
          </div>
        </div>
      </div>
    </div>
  );
};


const ASHAInterface = ({ user, onLogout }) => {
  const [view, setView] = useState('report');
  const [recording, setRecording] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [reportData, setReportData] = useState({ symptoms: [], voice: null, image: null, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [apiStatus, setApiStatus] = useState({ connected: false, message: 'Connecting...' });
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const { isOnline, addToQueue, syncQueue, queueLength } = useOfflineQueue();
  
  const symptomOptions = ['Fever', 'Headache', 'Body Pain', 'Vomiting', 'Diarrhea', 'Rash', 'Cough', 'Breathing Difficulty', 'Fatigue', 'Nausea'];

  useEffect(() => {
    api.get('/health')
      .then(() => setApiStatus({ connected: true, message: 'Connected' }))
      .catch(() => setApiStatus({ connected: false, message: 'Offline' }));
  }, []);

  useEffect(() => {
    if (isOnline && queueLength > 0) {
      syncQueue(async (report) => {
        const formData = new FormData();
        formData.append('village_id', report.village_id);
        report.symptoms.forEach(s => formData.append('symptoms', s));
        await api.postForm(`/api/v1/edge/submit-report?village_id=${report.village_id}&symptoms=${report.symptoms.join('&symptoms=')}`, formData);
      });
    }
  }, [isOnline, queueLength, syncQueue]);

  const toggleSymptom = (s) => setReportData(d => ({ ...d, symptoms: d.symptoms.includes(s) ? d.symptoms.filter(x => x !== s) : [...d.symptoms, s] }));
  
  const handleImageUpload = (e) => { 
    const f = e.target.files[0]; 
    if (f) { 
      const r = new FileReader(); 
      r.onloadend = () => { setImagePreview(r.result); setReportData(d => ({...d, image: f})); }; 
      r.readAsDataURL(f); 
    }
  };

  const handleCameraCapture = (result) => {
    setImagePreview(result.dataUrl);
    const file = new File([result.blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    setReportData(d => ({...d, image: file}));
    setShowCamera(false);
  };
  
  const startRecording = () => { 
    setRecording(true); 
    setTimeout(() => { 
      setRecording(false); 
      setReportData(d => ({...d, voice: new Blob(['audio'], { type: 'audio/wav' })})); 
    }, 3000); 
  };

  const submitReport = async () => {
    if (reportData.symptoms.length === 0) return;
    setSubmitting(true);
    
    const reportPayload = {
      village_id: user.village || 'Dharavi',
      symptoms: reportData.symptoms,
      notes: reportData.notes,
      timestamp: new Date().toISOString(),
    };

    try {
      if (!isOnline) {
        await addToQueue(reportPayload);
        const newReport = { id: Date.now(), ...reportPayload, status: 'queued', timestamp: new Date().toLocaleString() };
        setRecentReports(r => [newReport, ...r]);
      } else {
        const formData = new FormData();
        formData.append('village_id', reportPayload.village_id);
        reportData.symptoms.forEach(s => formData.append('symptoms', s));
        if (reportData.voice) formData.append('voice', reportData.voice, 'voice.wav');
        if (reportData.image) formData.append('image', reportData.image);
        
        const result = await api.postForm(`/api/v1/edge/submit-report?village_id=${reportPayload.village_id}&symptoms=${reportData.symptoms.join('&symptoms=')}`, formData);
        const newReport = { id: Date.now(), symptoms: reportData.symptoms, hasVoice: !!reportData.voice, hasImage: !!reportData.image, timestamp: new Date().toLocaleString(), status: 'processed', apiResponse: result };
        setRecentReports(r => [newReport, ...r]);
      }
      setReportData({ symptoms: [], voice: null, image: null, notes: '' }); 
      setImagePreview(null);
    } catch (err) {
      await addToQueue(reportPayload);
      const newReport = { id: Date.now(), symptoms: reportData.symptoms, timestamp: new Date().toLocaleString(), status: 'queued' };
      setRecentReports(r => [newReport, ...r]);
      setReportData({ symptoms: [], voice: null, image: null, notes: '' }); 
      setImagePreview(null);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-surface">
      <OfflineIndicator />
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      
      {/* Header */}
      <header className="bg-primary network-lines">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-lg font-semibold text-text-inverse">Sanket</h1>
            <p className="text-xs text-text-inverse/70 font-mono">{user.village} · {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded text-xs text-text-inverse">
              <StatusDot status={apiStatus.connected ? 'online' : 'offline'} />
              <span className="font-mono">{apiStatus.message}</span>
            </div>
            <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded transition-colors" aria-label="Logout">
              <LogOut className="w-4 h-4 text-text-inverse" />
            </button>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          <button onClick={() => setView('report')} className={`nav-item ${view === 'report' ? 'nav-item-active' : ''}`}>
            New Report
          </button>
          <button onClick={() => setView('history')} className={`nav-item ${view === 'history' ? 'nav-item-active' : ''}`}>
            History {queueLength > 0 && <span className="ml-1 badge badge-medium">{queueLength}</span>}
          </button>
        </div>
      </nav>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {view === 'report' && (
          <div className="space-y-4">
            {/* Symptoms */}
            <section className="card p-4">
              <h2 className="text-sm font-medium text-text-primary mb-3">Select Symptoms</h2>
              <div className="grid grid-cols-2 gap-2">
                {symptomOptions.map(s => (
                  <button 
                    key={s} 
                    onClick={() => toggleSymptom(s)} 
                    className={`p-2.5 text-sm font-medium rounded border transition-colors text-left ${
                      reportData.symptoms.includes(s) 
                        ? 'bg-accent text-white border-accent' 
                        : 'bg-white text-text-secondary border-border hover:border-accent'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
            
            {/* Voice */}
            <section className="card p-4">
              <h2 className="text-sm font-medium text-text-primary mb-3">Voice Recording</h2>
              <button 
                onClick={startRecording} 
                disabled={recording} 
                className={`w-full py-3 rounded border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  recording ? 'bg-red-50 border-red-200 text-red-700' : 
                  reportData.voice ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                  'bg-white border-border text-text-secondary hover:border-accent'
                }`}
              >
                <Mic className="w-4 h-4" />
                {recording ? 'Recording...' : reportData.voice ? 'Recorded' : 'Start Recording'}
              </button>
            </section>
            
            {/* Photo */}
            <section className="card p-4">
              <h2 className="text-sm font-medium text-text-primary mb-3">Photo</h2>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              {imagePreview ? (
                <div className="space-y-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCamera(true)} className="flex-1 btn btn-outline text-xs py-2">Retake</button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 btn btn-outline text-xs py-2">Upload</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowCamera(true)} className="flex-1 btn btn-outline py-3">
                    <Camera className="w-4 h-4" /> Camera
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 btn btn-outline py-3">
                    Upload
                  </button>
                </div>
              )}
            </section>
            
            {/* Notes */}
            <section className="card p-4">
              <h2 className="text-sm font-medium text-text-primary mb-3">Notes</h2>
              <textarea 
                value={reportData.notes} 
                onChange={(e) => setReportData(d => ({...d, notes: e.target.value}))} 
                placeholder="Additional information..." 
                className="input resize-none" 
                rows="3" 
              />
            </section>
            
            {/* Submit */}
            <button 
              onClick={submitReport} 
              disabled={submitting || reportData.symptoms.length === 0} 
              className="w-full btn btn-accent py-3 text-sm disabled:opacity-50"
            >
              {submitting ? 'Processing...' : <><Send className="w-4 h-4" /> Submit Report</>}
            </button>
          </div>
        )}
        
        {view === 'history' && (
          <div className="space-y-3">
            {recentReports.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-text-muted">No reports submitted yet</p>
              </div>
            ) : (
              recentReports.map(r => (
                <article key={r.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-mono text-text-muted">ID: {r.id}</p>
                      <p className="text-xs text-text-muted">{r.timestamp}</p>
                    </div>
                    <span className={`badge ${r.status === 'processed' ? 'badge-low' : 'badge-medium'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.symptoms.map(s => (
                      <span key={s} className="badge badge-accent">{s}</span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};


// Agent Communications Component
const AgentCommunications = () => {
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComms = async () => {
      try {
        const data = await api.get('/api/v1/swarm/communications?limit=50');
        setComms(data.communications || []);
      } catch (err) {
        console.error('Failed to fetch communications:', err);
      }
      setLoading(false);
    };
    fetchComms();
    const interval = setInterval(fetchComms, 5000);
    return () => clearInterval(interval);
  }, []);

  const getTypeStyle = (type) => {
    const styles = {
      'symptom_report': 'badge-accent',
      'status_query': 'badge-medium',
      'status_response': 'badge-low',
      'consensus_proposal': 'bg-violet-50 text-violet-700 border border-violet-200',
      'vote': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      'quantum_escalation': 'badge-critical',
      'quantum_trigger': 'badge-critical',
      'quantum_result': 'bg-pink-50 text-pink-700 border border-pink-200',
      'workflow_trigger': 'badge-high',
      'belief_share': 'badge-accent',
      'collective_decision': 'badge-low'
    };
    return styles[type] || 'bg-surface-200 text-text-secondary';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <CommunicationSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-primary">Agent Communications</h2>
        <span className="text-xs font-mono text-text-muted">{comms.length} messages</span>
      </div>
      
      <div className="card divide-y divide-border max-h-[500px] overflow-y-auto">
        {comms.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-muted">
            No communications yet
          </div>
        ) : (
          comms.slice().reverse().map((msg, idx) => (
            <div key={idx} className="p-3 hover:bg-surface-100 transition-colors">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-medium text-text-primary">{msg.from}</span>
                <ChevronRight className="w-3 h-3 text-text-muted" />
                <span className="text-xs font-medium text-text-primary">{msg.to}</span>
                <span className={`badge text-[10px] ${getTypeStyle(msg.type)}`}>
                  {msg.type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-xs font-mono text-text-muted bg-surface-100 rounded p-2 overflow-hidden">
                {JSON.stringify(msg.content, null, 0).slice(0, 120)}...
              </div>
              <time className="text-[10px] font-mono text-text-muted mt-1 block">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </time>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const OfficialDashboard = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [swarmData, setSwarmData] = useState({});
  const [quantumInsights, setQuantumInsights] = useState({ outbreakProbability: 0, hiddenCorrelations: 0, resourceOptimization: 'Pending', affectedVillages: [] });
  const [dashboardStats, setDashboardStats] = useState({ active_villages: 0, total_reports: 0, high_risk_villages: 0, average_outbreak_belief: 0 });
  const { sendAlertNotification, isGranted } = useNotifications();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [health, agents, quantum, dashboard] = await Promise.all([
          api.get('/health'), api.get('/api/v1/swarm/agents'), api.get('/api/v1/quantum/insights'), api.get('/api/v1/analytics/dashboard')
        ]);
        setApiConnected(true);
        if (agents.agents) {
          setSwarmData(agents.agents);
          const alertsFromAgents = Object.entries(agents.agents)
            .filter(([_, a]) => a.risk_level === 'high' || a.risk_level === 'critical')
            .map(([id, a], i) => ({
              id: i + 1, severity: a.risk_level === 'critical' ? 'critical' : 'high', village: a.name, 
              symptom: `${a.symptom_count} symptoms reported`, confidence: a.outbreak_belief, 
              quantum: a.outbreak_belief > 0.7, status: 'pending'
            }));
          
          if (isGranted) {
            alertsFromAgents.filter(a => a.severity === 'critical' && a.status === 'pending').forEach(sendAlertNotification);
          }
          setAlerts(alertsFromAgents);
        }
        if (quantum) setQuantumInsights({ 
          outbreakProbability: quantum.outbreak_probability || 0, 
          hiddenCorrelations: quantum.hidden_correlations?.length || 0, 
          resourceOptimization: 'Computed', 
          affectedVillages: quantum.high_risk_villages || [] 
        });
        if (dashboard) setDashboardStats(dashboard);
      } catch (err) {
        setApiConnected(false);
        setSwarmData({ 
          dharavi: { name: 'Dharavi', risk_level: 'high', outbreak_belief: 0.82, symptom_count: 8, location: [19.04, 72.86] }, 
          kalyan: { name: 'Kalyan', risk_level: 'medium', outbreak_belief: 0.65, symptom_count: 5, location: [19.24, 73.14] }, 
          thane: { name: 'Thane', risk_level: 'low', outbreak_belief: 0.42, symptom_count: 2, location: [19.22, 72.97] }, 
          navi_mumbai: { name: 'Navi Mumbai', risk_level: 'normal', outbreak_belief: 0.15, symptom_count: 0, location: [19.03, 73.01] }
        });
        setAlerts([{ id: 1, severity: 'high', village: 'Dharavi', symptom: 'Fever cluster (8 cases)', confidence: 0.87, quantum: true, status: 'pending' }]);
      }
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isGranted, sendAlertNotification]);

  const approveAlert = async (alertId) => {
    setAlerts(a => a.map(x => x.id === alertId ? {...x, status: 'approved'} : x));
  };

  const triggerQuantumAnalysis = async () => {
    try {
      const result = await api.post('/api/v1/quantum/analyze', {});
      setQuantumInsights({ 
        outbreakProbability: result.pattern_detection?.outbreak_probability || 0, 
        hiddenCorrelations: result.pattern_detection?.hidden_correlations?.length || 0, 
        resourceOptimization: 'Computed', 
        affectedVillages: result.pattern_detection?.high_risk_villages || [] 
      });
    } catch (err) { 
      console.error('Quantum analysis failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-primary h-16" />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle },
    { id: 'swarm', label: 'Swarm', icon: Radio },
    { id: 'comms', label: 'Communications', icon: Zap },
    { id: 'quantum', label: 'Quantum', icon: Brain },
    { id: 'map', label: 'Map', icon: MapPin },
  ];

  const getRiskBadge = (level) => {
    const badges = {
      critical: 'badge-critical',
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low',
      normal: 'badge-low',
    };
    return badges[level] || badges.normal;
  };

  return (
    <div className="min-h-screen bg-surface">
      <NotificationBanner />
      <OfflineIndicator />
      
      {/* Header */}
      <header className="bg-primary network-lines sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent/20 rounded flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-text-inverse">Sanket Command</h1>
              <p className="text-[10px] font-mono text-text-inverse/60">{user.designation}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded text-xs text-text-inverse">
              <StatusDot status={apiConnected ? 'online' : 'offline'} />
              <span className="font-mono text-[10px]">{apiConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
            <button className="relative p-2 hover:bg-white/10 rounded transition-colors">
              <Bell className="w-4 h-4 text-text-inverse" />
              {alerts.filter(a => a.status === 'pending').length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
              )}
            </button>
            <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded transition-colors">
              <LogOut className="w-4 h-4 text-text-inverse" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id)} 
              className={`nav-item flex items-center gap-1.5 whitespace-nowrap ${activeView === item.id ? 'nav-item-active' : ''}`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <p className="stat-label">Active Nodes</p>
                <p className="stat-value">{dashboardStats.active_villages || Object.keys(swarmData).length}</p>
                <p className="text-xs font-mono text-text-muted mt-1">villages monitored</p>
              </div>
              <div className="stat-card border-l-2 border-l-red-500">
                <p className="stat-label">Active Alerts</p>
                <p className="stat-value text-red-600">{alerts.filter(a => a.status === 'pending').length}</p>
                <p className="text-xs font-mono text-text-muted mt-1">require action</p>
              </div>
              <div className="stat-card border-l-2 border-l-accent">
                <p className="stat-label">Outbreak Risk</p>
                <p className="stat-value font-mono">{(quantumInsights.outbreakProbability * 100).toFixed(1)}%</p>
                <p className="text-xs font-mono text-text-muted mt-1">quantum confidence</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Total Reports</p>
                <p className="stat-value">{dashboardStats.total_reports || Object.values(swarmData).reduce((s, v) => s + (v.symptom_count || 0), 0)}</p>
                <p className="text-xs font-mono text-text-muted mt-1">symptoms logged</p>
              </div>
            </div>
            
            {/* Alerts Section */}
            <section className="card">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-medium text-text-primary">Pending Alerts</h2>
              </div>
              <div className="divide-y divide-border">
                {alerts.filter(a => a.status === 'pending').length === 0 ? (
                  <p className="p-4 text-sm text-text-muted">No pending alerts</p>
                ) : (
                  alerts.filter(a => a.status === 'pending').map(alert => (
                    <div key={alert.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary">{alert.village}</span>
                          <span className={`badge ${getRiskBadge(alert.severity)}`}>{alert.severity}</span>
                          {alert.quantum && <span className="badge badge-accent">QUANTUM</span>}
                        </div>
                        <p className="text-xs text-text-muted">{alert.symptom}</p>
                        <p className="text-xs font-mono text-text-muted mt-1">Confidence: {(alert.confidence * 100).toFixed(0)}%</p>
                      </div>
                      <button onClick={() => approveAlert(alert.id)} className="btn btn-accent text-xs">
                        Dispatch
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeView === 'alerts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-primary">All Alerts</h2>
              <button className="btn btn-outline text-xs">Export</button>
            </div>
            <div className="card divide-y divide-border">
              {alerts.map(alert => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`badge ${getRiskBadge(alert.severity)}`}>{alert.severity}</span>
                        {alert.quantum && <span className="badge badge-accent">QUANTUM</span>}
                        <span className={`badge ${alert.status === 'pending' ? 'badge-medium' : 'badge-low'}`}>{alert.status}</span>
                      </div>
                      <h3 className="text-sm font-medium text-text-primary">{alert.village}</h3>
                      <p className="text-xs text-text-muted mt-1">{alert.symptom}</p>
                      <p className="text-xs font-mono text-text-muted mt-1">Confidence: {(alert.confidence * 100).toFixed(0)}%</p>
                    </div>
                    {alert.status === 'pending' && (
                      <button onClick={() => approveAlert(alert.id)} className="btn btn-accent text-xs">Approve</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'swarm' && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-text-primary">Swarm Network Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(swarmData).map(([id, village]) => (
                <article key={id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">{village.name}</h3>
                      <p className="text-[10px] font-mono text-text-muted">ID: {id}</p>
                    </div>
                    <span className={`badge ${getRiskBadge(village.risk_level)}`}>
                      {(village.risk_level || 'normal').toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Outbreak Belief</span>
                      <span className="font-mono text-text-primary">{((village.outbreak_belief || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(village.outbreak_belief || 0) * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-text-muted">Symptoms</span>
                      <span className="font-mono font-medium text-text-primary">{village.symptom_count || 0}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeView === 'comms' && <AgentCommunications />}

        {activeView === 'quantum' && (
          <div className="space-y-6">
            {/* Quantum Header */}
            <div className="card p-4 bg-primary network-lines">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded flex items-center justify-center glow-accent">
                    <Brain className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-text-inverse">Quantum Intelligence</h2>
                    <p className="text-[10px] font-mono text-text-inverse/60">Cirq Pattern Analysis</p>
                  </div>
                </div>
                <button onClick={triggerQuantumAnalysis} className="btn btn-accent text-xs">
                  Run Analysis
                </button>
              </div>
            </div>

            {/* Quantum Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4">
                <p className="stat-label">Outbreak Probability</p>
                <p className="text-3xl font-mono font-semibold text-text-primary mt-1">
                  {(quantumInsights.outbreakProbability * 100).toFixed(1)}%
                </p>
                <div className="progress-bar mt-3">
                  <div className="progress-fill" style={{ width: `${quantumInsights.outbreakProbability * 100}%` }} />
                </div>
              </div>
              <div className="card p-4">
                <p className="stat-label">Hidden Correlations</p>
                <p className="text-3xl font-mono font-semibold text-text-primary mt-1">
                  {quantumInsights.hiddenCorrelations}
                </p>
                <p className="text-xs text-text-muted mt-2">Non-obvious transmission pathways</p>
              </div>
              <div className="card p-4">
                <p className="stat-label">Resource Optimization</p>
                <p className="text-lg font-medium text-text-primary mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  {quantumInsights.resourceOptimization}
                </p>
                <p className="text-xs text-text-muted mt-2">QAOA algorithm status</p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'map' && (
          <LeafletMap 
            villages={swarmData} 
            onVillageClick={(id, village) => console.log('Village:', id, village)} 
          />
        )}
      </main>
    </div>
  );
};

export default SanketApp;
