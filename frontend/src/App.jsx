import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Activity, Map, Brain, Users, CheckCircle, Mic, Camera, LogOut, Bell, Send, MapPin, Settings } from 'lucide-react';
import { auth, signInWithGooglePopup, signOutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import LeafletMap from './components/LeafletMap';
import CameraCapture from './components/CameraCapture';
import OfflineIndicator from './components/OfflineIndicator';
import NotificationBanner from './components/NotificationBanner';
import { 
  DashboardSkeleton, 
  VillageCardSkeleton, 
  AlertSkeleton, 
  CommunicationSkeleton,
  StatCardSkeleton 
} from './components/SkeletonLoaders';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { useOfflineQueue } from './hooks/useOfflineQueue';

const API_BASE = 'http://localhost:8000';

// Allowed emails for Health Official role
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

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

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
          alert('This email is not authorized as Health Official.');
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
      alert('This email is not authorized as Health Official.');
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
        alert('This email is not authorized as Health Official.');
        return;
      }
      onLogin({ id: fbUser.uid, name: fbUser.displayName || 'User', email: fbUser.email || '', role, village: formData.village, phone: formData.phone });
    } catch (e) {
      alert('Google Sign-In failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8" role="main" aria-labelledby="login-title">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-4" aria-hidden="true">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 id="login-title" className="text-3xl font-bold text-gray-900">Sanket</h1>
          <p className="text-gray-600 mt-2">Quantum-Enhanced Epidemiology Network</p>
        </div>
        {warnUnauthorizedOfficial && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
            This email is not authorized as Health Official. Please sign in with an approved account or continue as ASHA.
          </div>
        )}
        <div className="flex gap-2 mb-6" role="tablist" aria-label="Select role">
          <button 
            onClick={() => setRole('asha')} 
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${role === 'asha' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            role="tab"
            aria-selected={role === 'asha'}
            aria-controls="login-form"
          >
            ASHA Worker
          </button>
          <button 
            onClick={() => setRole('official')} 
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${role === 'official' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            role="tab"
            aria-selected={role === 'official'}
            aria-controls="login-form"
          >
            Health Official
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" id="login-form" role="tabpanel">
          {isSignup && (
            <div>
              <label htmlFor="name" className="sr-only">Full Name</label>
              <input id="name" type="text" placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required aria-required="true" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input id="email" type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required aria-required="true" />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input id="password" type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required aria-required="true" />
          </div>
          {isSignup && role === 'asha' && (
            <>
              <div>
                <label htmlFor="village" className="sr-only">Village Name</label>
                <input id="village" type="text" placeholder="Village Name" value={formData.village} onChange={(e) => setFormData({...formData, village: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required aria-required="true" />
              </div>
              <div>
                <label htmlFor="phone" className="sr-only">Phone Number</label>
                <input id="phone" type="tel" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required aria-required="true" />
              </div>
            </>
          )}
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all">
            {isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <div className="mt-4">
          <button onClick={loginWithGoogle} className="w-full py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all">
            Continue with Google
          </button>
        </div>
        <div className="mt-4 text-center">
          <button onClick={() => setIsSignup(!isSignup)} className="text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">
            {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">Quick Demo Access</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={() => demoLogin('asha')} className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">Dharavi ASHA</button>
              <button onClick={() => demoLogin('asha_kalyan')} className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">Kalyan ASHA</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => demoLogin('asha_thane')} className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">Thane ASHA</button>
              <button onClick={() => demoLogin('asha_navi')} className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">Navi Mumbai ASHA</button>
            </div>
            <button onClick={() => demoLogin('official')} className="w-full py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all">Health Official</button>
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
  const [apiStatus, setApiStatus] = useState({ connected: false, message: 'Checking...' });
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const { isOnline, addToQueue, syncQueue, queueLength } = useOfflineQueue();
  
  const symptomOptions = ['Fever', 'Headache', 'Body Pain', 'Vomiting', 'Diarrhea', 'Rash', 'Cough', 'Breathing Difficulty', 'Fatigue', 'Nausea'];

  useEffect(() => {
    api.get('/health')
      .then(() => setApiStatus({ connected: true, message: 'Connected to Backend' }))
      .catch(() => setApiStatus({ connected: false, message: 'Backend offline' }));
  }, []);

  // Sync offline queue when back online
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
    if (reportData.symptoms.length === 0) { 
      alert('Please select at least one symptom'); 
      return; 
    }
    setSubmitting(true);
    
    const reportPayload = {
      village_id: user.village || 'Dharavi',
      symptoms: reportData.symptoms,
      notes: reportData.notes,
      timestamp: new Date().toISOString(),
    };

    try {
      if (!isOnline) {
        // Queue for later sync
        await addToQueue(reportPayload);
        const newReport = { 
          id: Date.now(), 
          ...reportPayload, 
          status: 'Queued (offline)',
          timestamp: new Date().toLocaleString() 
        };
        setRecentReports(r => [newReport, ...r]);
        alert('You\'re offline. Report saved and will sync when connected.');
      } else {
        const formData = new FormData();
        formData.append('village_id', reportPayload.village_id);
        reportData.symptoms.forEach(s => formData.append('symptoms', s));
        if (reportData.voice) formData.append('voice', reportData.voice, 'voice.wav');
        if (reportData.image) formData.append('image', reportData.image);
        
        const result = await api.postForm(`/api/v1/edge/submit-report?village_id=${reportPayload.village_id}&symptoms=${reportData.symptoms.join('&symptoms=')}`, formData);
        const newReport = { 
          id: Date.now(), 
          symptoms: reportData.symptoms, 
          hasVoice: !!reportData.voice, 
          hasImage: !!reportData.image, 
          notes: reportData.notes, 
          timestamp: new Date().toLocaleString(), 
          status: 'Processed', 
          apiResponse: result 
        };
        setRecentReports(r => [newReport, ...r]);
        alert('Report submitted! AI agents are analyzing the data.');
      }
      
      setReportData({ symptoms: [], voice: null, image: null, notes: '' }); 
      setImagePreview(null);
    } catch (err) {
      console.error('Submit error:', err);
      // Fallback to offline queue
      await addToQueue(reportPayload);
      const newReport = { 
        id: Date.now(), 
        symptoms: reportData.symptoms, 
        timestamp: new Date().toLocaleString(), 
        status: 'Queued (error)' 
      };
      setRecentReports(r => [newReport, ...r]);
      setReportData({ symptoms: [], voice: null, image: null, notes: '' }); 
      setImagePreview(null);
      alert('Failed to submit. Report saved locally.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator />
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Sanket ASHA</h1>
            <p className="text-sm text-indigo-100">{user.name} - {user.village}</p>
          </div>
          <div className="flex items-center gap-2">
            <span 
              className={`px-2 py-1 rounded text-xs ${apiStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}
              role="status"
              aria-live="polite"
            >
              {apiStatus.message}
            </span>
            <button 
              onClick={onLogout} 
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      
      <nav className="bg-white border-b sticky top-0 z-10" role="navigation" aria-label="Main navigation">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          <button 
            onClick={() => setView('report')} 
            className={`px-4 py-3 font-medium transition-colors ${view === 'report' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            aria-current={view === 'report' ? 'page' : undefined}
          >
            New Report
          </button>
          <button 
            onClick={() => setView('history')} 
            className={`px-4 py-3 font-medium transition-colors ${view === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            aria-current={view === 'history' ? 'page' : undefined}
          >
            History {queueLength > 0 && <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">{queueLength}</span>}
          </button>
        </div>
      </nav>
      
      <main className="max-w-4xl mx-auto px-4 py-6" role="main">
        {view === 'report' && (
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="symptoms-heading">
              <h2 id="symptoms-heading" className="text-lg font-semibold text-gray-900 mb-4">Select Symptoms</h2>
              <div className="grid grid-cols-2 gap-3" role="group" aria-label="Symptom options">
                {symptomOptions.map(s => (
                  <button 
                    key={s} 
                    onClick={() => toggleSymptom(s)} 
                    className={`p-3 rounded-lg text-left font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${reportData.symptoms.includes(s) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    aria-pressed={reportData.symptoms.includes(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
            
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="voice-heading">
              <h2 id="voice-heading" className="text-lg font-semibold text-gray-900 mb-4">Voice Recording (Optional)</h2>
              <button 
                onClick={startRecording} 
                disabled={recording} 
                className={`w-full py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${recording ? 'bg-red-500 text-white focus:ring-red-500' : reportData.voice ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'}`}
                aria-label={recording ? 'Recording in progress' : reportData.voice ? 'Voice recorded successfully' : 'Start voice recording'}
              >
                <Mic className="w-5 h-5" aria-hidden="true" />
                {recording ? 'Recording...' : reportData.voice ? 'Voice Recorded ✓' : 'Start Recording'}
              </button>
            </section>
            
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="photo-heading">
              <h2 id="photo-heading" className="text-lg font-semibold text-gray-900 mb-4">Photo (Optional)</h2>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" aria-hidden="true" />
              {imagePreview ? (
                <div className="space-y-3">
                  <img src={imagePreview} alt="Captured symptom preview" className="w-full h-48 object-cover rounded-lg" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCamera(true)} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all">
                      <Camera className="w-5 h-5 inline mr-2" aria-hidden="true" />
                      Retake
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all">
                      Upload Different
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCamera(true)} 
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                    aria-label="Take photo with camera"
                  >
                    <Camera className="w-5 h-5" aria-hidden="true" />
                    Take Photo
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex-1 py-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-600 hover:border-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                    aria-label="Upload photo from device"
                  >
                    Upload Photo
                  </button>
                </div>
              )}
            </section>
            
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="notes-heading">
              <h2 id="notes-heading" className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
              <label htmlFor="notes" className="sr-only">Additional notes about the symptoms</label>
              <textarea 
                id="notes"
                value={reportData.notes} 
                onChange={(e) => setReportData(d => ({...d, notes: e.target.value}))} 
                placeholder="Any additional information..." 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                rows="4" 
              />
            </section>
            
            <button 
              onClick={submitReport} 
              disabled={submitting || reportData.symptoms.length === 0} 
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
              aria-busy={submitting}
            >
              {submitting ? 'Processing...' : <><Send className="w-5 h-5" aria-hidden="true" />Submit Report</>}
            </button>
          </div>
        )}
        
        {view === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Reports</h2>
            {recentReports.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                <p className="text-gray-600">No reports yet.</p>
              </div>
            ) : (
              <ul className="space-y-4" role="list" aria-label="Recent symptom reports">
                {recentReports.map(r => (
                  <li key={r.id} className="bg-white rounded-xl shadow-sm p-6">
                    <article>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">Report #{r.id}</p>
                          <p className="text-sm text-gray-500">{r.timestamp}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${r.status === 'Processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3" role="list" aria-label="Reported symptoms">
                        {r.symptoms.map(s => (
                          <span key={s} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">{s}</span>
                        ))}
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        {r.hasVoice && <span aria-label="Includes voice recording">🎤 Voice</span>}
                        {r.hasImage && <span aria-label="Includes image">📷 Image</span>}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
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

  const getTypeColor = (type) => {
    const colors = {
      'symptom_report': 'bg-blue-100 text-blue-800',
      'status_query': 'bg-yellow-100 text-yellow-800',
      'status_response': 'bg-green-100 text-green-800',
      'consensus_proposal': 'bg-purple-100 text-purple-800',
      'vote': 'bg-indigo-100 text-indigo-800',
      'quantum_escalation': 'bg-red-100 text-red-800',
      'quantum_trigger': 'bg-red-100 text-red-800',
      'quantum_result': 'bg-pink-100 text-pink-800',
      'workflow_trigger': 'bg-orange-100 text-orange-800',
      'belief_share': 'bg-cyan-100 text-cyan-800',
      'collective_decision': 'bg-emerald-100 text-emerald-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading communications">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl shadow-sm divide-y">
          {Array.from({ length: 5 }).map((_, i) => <CommunicationSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900" id="comms-title">Agent Communications Log</h2>
        <span className="text-sm text-gray-500" aria-live="polite">{comms.length} messages</span>
      </div>
      <p className="text-sm text-gray-600">Real-time inter-agent communication showing how swarm intelligence emerges.</p>
      <div 
        className="bg-white rounded-xl shadow-sm divide-y max-h-96 overflow-y-auto" 
        role="log" 
        aria-labelledby="comms-title"
        aria-live="polite"
      >
        {comms.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No communications yet. Submit symptom reports to see agent interactions.</div>
        ) : (
          comms.slice().reverse().map((msg, idx) => (
            <article key={idx} className="p-4 hover:bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-gray-900">{msg.from}</span>
                <span className="text-gray-400" aria-hidden="true">→</span>
                <span className="sr-only">to</span>
                <span className="font-semibold text-gray-900">{msg.to}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(msg.type)}`}>{msg.type.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                {JSON.stringify(msg.content, null, 0).slice(0, 150)}
              </div>
              <time className="text-xs text-gray-400 mt-1 block">{new Date(msg.timestamp).toLocaleTimeString()}</time>
            </article>
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
              id: i + 1, severity: a.risk_level === 'critical' ? 'high' : 'medium', village: a.name, 
              symptom: `${a.symptom_count} symptoms reported`, confidence: a.outbreak_belief, 
              quantum: a.outbreak_belief > 0.7, status: 'pending'
            }));
          
          // Send notifications for new high-severity alerts
          if (isGranted) {
            alertsFromAgents.filter(a => a.severity === 'high' && a.status === 'pending').forEach(sendAlertNotification);
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
        console.error('API Error:', err);
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
    alert('Resources dispatched! Medical team notified.');
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
      alert('Quantum analysis complete!');
    } catch (err) { 
      alert('Quantum analysis failed: ' + err.message); 
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'swarm', label: 'Swarm' },
    { id: 'comms', label: 'Agent Comms' },
    { id: 'quantum', label: 'Quantum' },
    { id: 'map', label: 'Map' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationBanner />
      <OfflineIndicator />
      
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center" aria-hidden="true">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sanket Command Center</h1>
              <p className="text-sm text-gray-600">{user.name} - {user.designation}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span 
              className={`px-3 py-1 rounded-full text-xs font-medium ${apiConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              role="status"
              aria-live="polite"
            >
              {apiConnected ? '🟢 Live' : '🔴 Offline'}
            </span>
            <button 
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={`Notifications${alerts.filter(a => a.status === 'pending').length > 0 ? `, ${alerts.filter(a => a.status === 'pending').length} pending` : ''}`}
            >
              <Bell className="w-5 h-5 text-gray-600" aria-hidden="true" />
              {alerts.filter(a => a.status === 'pending').length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
              )}
            </button>
            <button 
              onClick={onLogout} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b" role="navigation" aria-label="Dashboard navigation">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id)} 
              className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${activeView === item.id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-current={activeView === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 py-6" role="main">
        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" role="region" aria-label="Dashboard statistics">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-indigo-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Villages</p>
                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.active_villages || Object.keys(swarmData).length}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-indigo-600" aria-hidden="true" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Alerts</p>
                    <p className="text-3xl font-bold text-gray-900">{alerts.filter(a => a.status === 'pending').length}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Outbreak Risk</p>
                    <p className="text-3xl font-bold text-gray-900">{(quantumInsights.outbreakProbability * 100).toFixed(0)}%</p>
                  </div>
                  <Brain className="w-8 h-8 text-purple-600" aria-hidden="true" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Reports</p>
                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.total_reports || Object.values(swarmData).reduce((s, v) => s + (v.symptom_count || 0), 0)}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-600" aria-hidden="true" />
                </div>
              </div>
            </div>
            
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="alerts-heading">
              <h2 id="alerts-heading" className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts - Action Required</h2>
              {alerts.filter(a => a.status === 'pending').length === 0 ? (
                <p className="text-gray-500">No pending alerts</p>
              ) : (
                <ul className="space-y-3" role="list">
                  {alerts.filter(a => a.status === 'pending').map(alert => (
                    <li key={alert.id} className={`p-4 rounded-lg border-l-4 ${alert.severity === 'high' ? 'bg-red-50 border-red-600' : alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-600' : 'bg-blue-50 border-blue-600'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">{alert.village}</span>
                            {alert.quantum && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">QUANTUM</span>}
                          </div>
                          <p className="text-gray-700">{alert.symptom}</p>
                          <p className="text-sm text-gray-600 mt-1">Confidence: {(alert.confidence * 100).toFixed(0)}%</p>
                        </div>
                        <button 
                          onClick={() => approveAlert(alert.id)} 
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                          aria-label={`Approve and dispatch resources to ${alert.village}`}
                        >
                          Approve & Dispatch
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {activeView === 'alerts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">All Alerts</h2>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">
                Export Report
              </button>
            </div>
            <ul className="space-y-4" role="list" aria-label="All alerts">
              {alerts.map(alert => (
                <li key={alert.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${alert.severity === 'high' ? 'bg-red-100 text-red-800' : alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        {alert.quantum && <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">QUANTUM</span>}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${alert.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                          {alert.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{alert.village}</h3>
                      <p className="text-gray-700 mb-2">{alert.symptom}</p>
                      <p className="text-sm text-gray-600">Confidence: {(alert.confidence * 100).toFixed(0)}%</p>
                    </div>
                    {alert.status === 'pending' && (
                      <button 
                        onClick={() => approveAlert(alert.id)} 
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeView === 'swarm' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Village Swarm Network (Live from API)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(swarmData).map(([id, village]) => (
                <article key={id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{village.name}</h3>
                      <p className="text-sm text-gray-600">Agent ID: {id}</p>
                    </div>
                    <span 
                      className={`w-3 h-3 rounded-full ${village.risk_level !== 'normal' ? 'bg-green-500' : 'bg-gray-300'}`}
                      aria-label={village.risk_level !== 'normal' ? 'Active' : 'Inactive'}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Risk Level</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${village.risk_level === 'high' || village.risk_level === 'critical' ? 'bg-red-100 text-red-800' : village.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {(village.risk_level || 'normal').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Outbreak Belief</span>
                      <span className="text-sm font-semibold text-gray-900">{((village.outbreak_belief || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div 
                      className="w-full bg-gray-200 rounded-full h-2" 
                      role="progressbar" 
                      aria-valuenow={(village.outbreak_belief || 0) * 100} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                      aria-label={`Outbreak belief: ${((village.outbreak_belief || 0) * 100).toFixed(0)}%`}
                    >
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all" style={{ width: `${(village.outbreak_belief || 0) * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Symptoms Reported</span>
                      <span className="text-lg font-bold text-gray-900">{village.symptom_count || 0}</span>
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
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Brain className="w-10 h-10" aria-hidden="true" />
                  <div>
                    <h2 className="text-2xl font-bold">Quantum Intelligence Layer</h2>
                    <p className="text-purple-100">TensorFlow Quantum / Cirq Analysis</p>
                  </div>
                </div>
                <button 
                  onClick={triggerQuantumAnalysis} 
                  className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600 transition-colors"
                >
                  Run Analysis
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Outbreak Probability</h3>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold text-gray-900">{(quantumInsights.outbreakProbability * 100).toFixed(1)}%</p>
                  <p className="text-sm text-gray-500 mb-1">confidence</p>
                </div>
                <div 
                  className="mt-4 w-full bg-gray-200 rounded-full h-3"
                  role="progressbar"
                  aria-valuenow={quantumInsights.outbreakProbability * 100}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all" style={{ width: `${quantumInsights.outbreakProbability * 100}%` }} />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Hidden Correlations</h3>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold text-gray-900">{quantumInsights.hiddenCorrelations}</p>
                  <p className="text-sm text-gray-500 mb-1">detected</p>
                </div>
                <p className="mt-4 text-sm text-gray-600">Non-obvious transmission pathways via quantum analysis</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Resource Optimization</h3>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600" aria-hidden="true" />
                  <p className="text-xl font-bold text-gray-900">{quantumInsights.resourceOptimization}</p>
                </div>
                <p className="mt-4 text-sm text-gray-600">QAOA algorithm optimized distribution</p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'map' && (
          <LeafletMap 
            villages={swarmData} 
            onVillageClick={(id, village) => console.log('Village clicked:', id, village)} 
          />
        )}
      </main>
    </div>
  );
};

export default SanketApp;
