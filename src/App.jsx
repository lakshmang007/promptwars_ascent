import { useState, useRef } from 'react';
import { ref, uploadBytes } from "firebase/storage";
import { storage } from './firebase';
import { analyzeDocumentWithAI } from './services/ai';
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
  const [fileName, setFileName] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [docText, setDocText] = useState("");
  const [insights, setInsights] = useState([]);
  const fileInputRef = useRef(null);

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

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    // 1. Upload to Firebase
    const storageRef = ref(storage, `contracts/${uploadedFile.name}-${Date.now()}`);
    try {
      await uploadBytes(storageRef, uploadedFile);
    } catch (fbError) {
      console.warn("Firebase upload skipped:", fbError);
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

  const loadDemoContract = () => {
    processTextWithAI(DEMO_CONTRACT, "Demo_Employment_Agreement.txt");
  };

  const getRiskClass = (score) => {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  return (
    <div className="app-container">
      {/* Google-style Top App Bar */}
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
          <div className="avatar">JD</div>
        </div>
      </nav>

      <div className="main-wrapper">
        {/* Google-style Side Drawer */}
        <aside className="sidebar">
          <div className="nav-item active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            Analyzer
          </div>
          <div className="nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            My Contracts
          </div>
          <div className="nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </div>
        </aside>

        {/* Dashboard Content */}
        <main className="dashboard">
          
          {!fileName && (
            <div className="product-info">
              <h1>Welcome to LexGuard</h1>
              <p>
                LexGuard is an <strong>AI Rights & Contract Intelligence System</strong> built to protect individuals and organizations from hidden liabilities. By leveraging Google Gemini AI, it analyzes legal and quasi-legal documents before you agree to them, extracting meaningful clauses, identifying unfavorable conditions, and providing transparent explanations in plain language.
              </p>

              <div className="feature-grid">
                <div className="feature-card blue">
                  <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    Clause Extraction
                  </h3>
                  <p>Automatically isolates critical legal obligations and conditions from dense text.</p>
                </div>
                <div className="feature-card red">
                  <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    Risk Detection
                  </h3>
                  <p>Identifies one-sided terms, broad IP transfers, and hidden liabilities using severity scoring.</p>
                </div>
                <div className="feature-card green">
                  <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Plain Explanation
                  </h3>
                  <p>Translates complex legalese into understandable implications for informed decisions.</p>
                </div>
              </div>

              <div className="action-area">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  style={{display: 'none'}} 
                  accept=".txt"
                />
                <button className="btn-primary" onClick={() => fileInputRef.current.click()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload Contract (.txt)
                </button>
                
                <button className="btn-secondary" onClick={loadDemoContract}>
                  Load Demo Contract
                </button>
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      {fileName}
                    </span>
                    {isScanning && (
                      <span style={{color: 'var(--google-blue)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem'}}>
                        <div className="spinner" style={{width: '16px', height: '16px', borderWidth: '2px'}}></div>
                        Processing with Gemini...
                      </span>
                    )}
                  </div>
                  <div className="doc-content">
                    {isScanning && <div className="scanner-overlay"></div>}
                    <div className="doc-paper">
                      {docText}
                    </div>
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
                        <div key={insight.id} className={\`insight-card \${getRiskClass(insight.risk_score)}\`}>
                          <div className="insight-header">
                            <span className="insight-title">{insight.title}</span>
                            <span className={\`risk-badge \${getRiskClass(insight.risk_score)}\`}>
                              Risk Score: {insight.risk_score}/10
                            </span>
                          </div>
                          <div className="insight-explanation">
                            {insight.plain_language_explanation}
                          </div>
                          <div className="insight-snippet">
                            "{insight.extracted_text}"
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
