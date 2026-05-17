import { useState, useRef } from 'react';
import { ref, uploadBytes } from "firebase/storage";
import { storage } from './firebase';
import { analyzeDocumentWithAI } from './services/ai';
import './index.css';

const DEMO_CONTRACT = \`EMPLOYMENT AND CONFIDENTIALITY AGREEMENT

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
Any dispute arising out of or relating to this Agreement or the employment relationship shall be resolved by mandatory, binding arbitration conducted confidentially in the State of Delaware. The Employee expressly waives any right to bring a class action lawsuit or a trial by jury against the Company.\`;

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
    const storageRef = ref(storage, \`contracts/\${uploadedFile.name}-\${Date.now()}\`);
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
    
    // 3. Process
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
      <nav className="navbar">
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--google-blue)" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>L</span><span>E</span><span>X</span><span>G</span><span>U</span><span>A</span><span>R</span><span>D</span>
        </div>
        <div className="nav-links">
          <span style={{color: 'var(--text-primary)', fontWeight: '500'}}>Intelligence Dashboard</span>
          <span>Integrations</span>
          <span>Documentation</span>
        </div>
      </nav>

      <main className="dashboard">
        {!fileName ? (
          <div className="landing-view">
            <div className="hero-section">
              <h1 className="hero-title">AI Rights & Contract Intelligence</h1>
              <p className="hero-description">
                Upload legal and quasi-legal documents to instantly identify hidden liabilities, detect exploitative language, and generate severity-based risk scores using Google Gemini AI. Protect your rights before you sign.
              </p>
              
              <div className="action-buttons">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  style={{display: 'none'}} 
                  accept=".txt"
                />
                <button className="btn-primary" onClick={() => fileInputRef.current.click()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload Contract (.txt)
                </button>
                
                <button className="btn-secondary" onClick={loadDemoContract}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Load Demo Contract
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="analysis-layout">
            <div className="document-viewer glass-panel">
              <div className="doc-header">
                <h3 className="mono" style={{color: 'white', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--google-blue)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  {fileName}
                </h3>
                {isScanning ? (
                  <span className="mono" style={{color: 'var(--google-blue)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'}}>
                    Scanning Document Structure...
                  </span>
                ) : (
                  <span className="mono" style={{color: 'var(--google-green)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Analysis Complete
                  </span>
                )}
              </div>
              <div className="doc-content">
                {isScanning && <div className="scanner-overlay"></div>}
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', opacity: isScanning ? 0.5 : 1, transition: 'opacity 0.3s' }}>
                  {docText}
                </div>
              </div>
            </div>

            <div className="insights-sidebar">
              <div style={{padding: '0 0.5rem', marginBottom: '0.5rem'}}>
                <h2 className="mono" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--google-yellow)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  AI Risk Report
                </h2>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem'}}>
                  Extracted clauses and hidden liabilities evaluated by Gemini.
                </p>
              </div>

              {isScanning ? (
                 <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-secondary)'}}>
                   <div className="spinner"></div>
                   <p className="mono" style={{marginTop: '1.5rem', color: 'var(--google-blue)'}}>Querying Gemini Model...</p>
                 </div>
              ) : (
                <>
                  {insights.map((insight) => (
                    <div key={insight.id} className={\`insight-card glass-panel \${getRiskClass(insight.risk_score)}\`}>
                      <div className="insight-header">
                        <span className="insight-title">{insight.title}</span>
                        <span className={\`risk-badge \${getRiskClass(insight.risk_score)}\`}>
                          Risk: {insight.risk_score}/10
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
        )}
      </main>
    </div>
  );
}

export default App;
