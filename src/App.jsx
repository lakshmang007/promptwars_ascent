import { useState, useRef, useEffect } from 'react';
import { ref, uploadBytes } from "firebase/storage";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { storage, auth, googleProvider } from './firebase';
import { analyzeDocumentWithAI, askLexGuardChatbot } from './services/ai';
import './index.css';

const DEMO_CONTRACT = `EMPLOYMENT AND CONFIDENTIALITY AGREEMENT

This Employment and Confidentiality Agreement ("Agreement") is made effective as of the date of electronic acceptance, by and between LexGuard Corp ("Company") and the Employee.

1. POSITION AND DUTIES
The Employee agrees to perform all duties assigned by the Company. The Company reserves the right to modify the Employee's job title, duties, and reporting structure at any time, without prior notice or consent.

2. AT-WILL EMPLOYMENT
Employment with the Company is "at-will." The Company may terminate the Employee's employment at any time, for any reason or no reason, with or without cause, and without prior notice.

3. NON-COMPETITION
During the term of employment and for a period of sixty (60) months following the termination of employment for any reason, the Employee shall not, directly or indirectly, engage in, consult for, or be employed by any business, enterprise, or entity that competes with the Company anywhere in the world.

4. INTELLECTUAL PROPERTY ASSIGNMENT
Any and all inventions, discoveries, software, artwork, writings, or other intellectual property ("IP") created by the Employee during the term of this Agreement, whether created during working hours or on personal time, and whether utilizing Company resources or personal resources, shall become the exclusive, perpetual, and royalty-free property of the Company.

5. ARBITRATION AND WAIVER OF JURY TRIAL
Any dispute arising out of or relating to this Agreement or the employment relationship shall be resolved by mandatory, binding arbitration conducted confidentially in the State of Delaware. The Employee expressly waives any right to bring a class action lawsuit or a trial by jury against the Company.`;

function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App state
  const [activeTab, setActiveTab] = useState("Analyzer");
  const [fileName, setFileName] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [docText, setDocText] = useState("");
  const [insights, setInsights] = useState([]);
  
  // Settings State
  const [apiKeyInput, setApiKeyInput] = useState("");

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  // Chatbot state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: "Hello! I am the LexGuard Assistant. Ask me anything about your uploaded contract." }
  ]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    // Load existing api key
    const existingKey = localStorage.getItem("gemini_api_key");
    if (existingKey) {
      setApiKeyInput(existingKey);
    }
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Failed to sign in. Please check your Firebase settings.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const saveApiKey = () => {
    localStorage.setItem("gemini_api_key", apiKeyInput);
    alert("Gemini API Key saved securely to your browser!");
  };

  const processTextWithAI = async (text, name) => {
    setFileName(name);
    setDocText(text);
    setIsScanning(true);
    setInsights([]);

    try {
      const analysisResults = await analyzeDocumentWithAI(text);
      setInsights(analysisResults);
    } catch (error) {
      console.error("Error processing document:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const processFile = async (uploadedFile) => {
    if (!uploadedFile) return;

    // 1. Upload to Firebase under user's folder
    const storagePath = user ? `contracts/${user.uid}/${uploadedFile.name}-${Date.now()}` : `contracts/anonymous/${uploadedFile.name}-${Date.now()}`;
    const storageRef = ref(storage, storagePath);
    try {
      await uploadBytes(storageRef, uploadedFile);
    } catch (fbError) {
      console.warn("Firebase upload skipped (check rules/keys):", fbError);
    }
    
    // 2. Read Native Text
    const extractedText = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(uploadedFile);
    });
    
    processTextWithAI(extractedText, uploadedFile.name);
  };

  const handleFileUpload = (e) => processFile(e.target.files[0]);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };
  const loadDemoContract = () => processTextWithAI(DEMO_CONTRACT, "Demo_Employment_Agreement.txt");

  const getRiskClass = (score) => {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    const reply = await askLexGuardChatbot(userMsg, docText);
    setChatHistory(prev => [...prev, { sender: 'bot', text: reply }]);
  };
  const handleChatKeyDown = (e) => { if (e.key === 'Enter') sendChatMessage(); };

  if (authLoading) {
    return <div style={{display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center'}}><div className="spinner"></div></div>;
  }

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="app-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F1F3F4'}}>
        <div style={{background: 'white', padding: '3rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '450px'}}>
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1.5rem'}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--google-blue)" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={{fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--text-primary)'}}>Sign in to LexGuard</h1>
          <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>Use your Google Account to access the AI Contract Intelligence platform securely.</p>
          <button onClick={handleLogin} style={{
            background: 'white', color: '#3C4043', border: '1px solid #DADCE0', borderRadius: '4px', padding: '12px 24px', 
            fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px', margin: '0 auto 1rem auto', cursor: 'pointer', transition: 'background 0.2s'
          }} onMouseOver={e => e.currentTarget.style.background = '#F8F9FA'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            Sign in with Google
          </button>
          
          <button 
            onClick={() => {
              setUser({
                uid: 'demo-user-123',
                displayName: 'Demo User',
                photoURL: 'https://ui-avatars.com/api/?name=Demo+User&background=4285F4&color=fff'
              });
            }} 
            style={{
              background: 'transparent', color: 'var(--text-secondary)', border: 'none', 
              fontSize: '0.85rem', textDecoration: 'underline', cursor: 'pointer'
            }}
          >
            Bypass Login for Testing
          </button>
        </div>
      </div>
    );
  }

  // --- DASHBOARD SCREEN ---
  return (
    <div className="app-container">
      {/* Top App Bar */}
      <nav className="navbar">
        <div className="logo-section">
          <div className="hamburger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--google-blue)" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>LexGuard</span>
          </div>
        </div>
        <div className="navbar-right">
          <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>{user.displayName}</span>
          <img src={user.photoURL} alt="User avatar" style={{width: '32px', height: '32px', borderRadius: '50%'}} />
          <button onClick={handleLogout} style={{background: 'transparent', border: 'none', color: 'var(--google-blue)', cursor: 'pointer', fontWeight: 500}}>Sign Out</button>
        </div>
      </nav>

      <div className="main-wrapper">
        {/* Side Drawer */}
        <aside className="sidebar">
          <div className={`nav-item ${activeTab === 'Analyzer' ? 'active' : ''}`} onClick={() => setActiveTab('Analyzer')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            Analyzer
          </div>
          <div className={`nav-item ${activeTab === 'My Contracts' ? 'active' : ''}`} onClick={() => setActiveTab('My Contracts')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            My Contracts
          </div>
          <div className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`} onClick={() => setActiveTab('Settings')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </div>
        </aside>

        {/* Dashboard Content */}
        <main className="dashboard">
          
          {/* Settings Tab View */}
          {activeTab === 'Settings' && (
            <div className="product-info" style={{maxWidth: '600px'}}>
              <h2>Platform Settings</h2>
              <p style={{marginTop: '0.5rem'}}>Configure your LexGuard AI integrations below.</p>
              
              <div style={{marginTop: '2rem'}}>
                <label style={{display: 'block', fontWeight: 500, marginBottom: '0.5rem'}}>Google Gemini API Key</label>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <input 
                    type="password" 
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your Gemini API key (AIzaSy...)"
                    style={{flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none'}}
                  />
                  <button className="btn-primary" onClick={saveApiKey}>Save Key</button>
                </div>
                <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem'}}>
                  This key is stored locally in your browser and used to power the real-time contract analysis and chatbot.
                </p>
              </div>
            </div>
          )}

          {/* Under Development Views */}
          {activeTab === 'My Contracts' && (
            <div className="product-info" style={{textAlign: 'center', padding: '4rem'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" strokeWidth="2" style={{margin: '0 auto 1rem'}}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <h2>{activeTab} Module</h2>
              <p style={{marginTop: '1rem'}}>This feature is under development for the LexGuard platform.</p>
            </div>
          )}

          {/* Analyzer View */}
          {activeTab === 'Analyzer' && (
            <>
              {!fileName && (
                <div className="product-info">
                  <h1>Welcome to LexGuard, {user.displayName.split(" ")[0]}</h1>
                  <p>
                    LexGuard is an <strong>AI Rights & Contract Intelligence System</strong> built to protect individuals and organizations from hidden liabilities. By leveraging Google Gemini AI, it analyzes legal and quasi-legal documents before you agree to them, extracting meaningful clauses, identifying unfavorable conditions, and providing transparent explanations in plain language.
                  </p>

                  <div className="feature-grid">
                    <div className="feature-card blue">
                      <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        Clause Extraction
                      </h3>
                      <p>Automatically isolates critical legal obligations and conditions from dense text.</p>
                    </div>
                    <div className="feature-card red">
                      <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Risk Detection
                      </h3>
                      <p>Identifies one-sided terms, broad IP transfers, and hidden liabilities using severity scoring.</p>
                    </div>
                    <div className="feature-card green">
                      <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Plain Explanation
                      </h3>
                      <p>Translates complex legalese into understandable implications for informed decisions.</p>
                    </div>
                  </div>

                  <div 
                    className={`action-area ${isDragging ? 'drag-zone' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      padding: '2rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                      border: isDragging ? '2px dashed var(--google-blue)' : '2px dashed var(--border-color)',
                      background: isDragging ? '#E8F0FE' : 'transparent', transition: 'all 0.2s'
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p style={{margin: 0, fontWeight: 500}}>Drag and drop a .txt contract file here</p>
                    <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Or use the buttons below</p>
                    <div style={{display: 'flex', gap: '1rem'}}>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{display: 'none'}} accept=".txt"/>
                      <button className="btn-primary" onClick={() => fileInputRef.current.click()}>Browse Files</button>
                      <button className="btn-secondary" onClick={loadDemoContract}>Load Demo Contract</button>
                    </div>
                  </div>
                </div>
              )}

              {fileName && (
                <div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h2 style={{fontWeight: 400, fontSize: '1.25rem'}}>Contract Analysis</h2>
                    <button className="btn-secondary" onClick={() => setFileName(null)}>Analyze Another</button>
                  </div>
                  <div className="analysis-layout">
                    {/* Document Panel */}
                    <div className="document-viewer">
                      <div className="doc-header">
                        <span style={{fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                          {fileName}
                        </span>
                        {isScanning && (
                          <span style={{color: 'var(--google-blue)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem'}}>
                            <div className="spinner" style={{width: '16px', height: '16px', borderWidth: '2px'}}></div>Processing with Gemini...
                          </span>
                        )}
                      </div>
                      <div className="doc-content">
                        {isScanning && <div className="scanner-overlay"></div>}
                        <div className="doc-paper">{docText}</div>
                      </div>
                    </div>

                    {/* Insights Panel */}
                    <div className="insights-sidebar">
                      {isScanning ? (
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
                          <div className="spinner" style={{width: '36px', height: '36px'}}></div>
                          <p style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>Extracting obligations...</p>
                        </div>
                      ) : (
                        <>
                          {insights.map((insight) => (
                            <div key={insight.id} className={`insight-card ${getRiskClass(insight.risk_score)}`}>
                              <div className="insight-header">
                                <span className="insight-title">{insight.title}</span>
                                <span className={`risk-badge ${getRiskClass(insight.risk_score)}`}>Risk Score: {insight.risk_score}/10</span>
                              </div>
                              <div className="insight-explanation">{insight.plain_language_explanation}</div>
                              <div className="insight-snippet">"{insight.extracted_text}"</div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Chatbot Floating Widget */}
      {activeTab === 'Analyzer' && fileName && (
        <>
          <div className="chat-fab" onClick={() => setIsChatOpen(!isChatOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </div>

          {isChatOpen && (
            <div className="chat-window">
              <div className="chat-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12L2.1 7.1"></path><path d="M12 12l9.9 4.9"></path></svg>
                LexGuard AI Assistant
              </div>
              <div className="chat-messages">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`chat-msg ${msg.sender}`}>{msg.text}</div>
                ))}
              </div>
              <div className="chat-input-area">
                <input type="text" placeholder="Ask about this contract..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown}/>
                <button onClick={sendChatMessage}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
