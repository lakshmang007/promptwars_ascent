import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from './firebase';
import { analyzeDocumentWithAI } from './services/ai';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [docText, setDocText] = useState("");
  const [insights, setInsights] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setIsScanning(true);
    setInsights([]);

    try {
      // 1. Upload to Firebase Storage
      const storageRef = ref(storage, `contracts/${uploadedFile.name}-${Date.now()}`);
      
      // We wrap the upload in a try-catch so it doesn't crash the app if Firebase 
      // isn't fully configured yet (e.g. missing API keys or CORS issues)
      try {
        await uploadBytes(storageRef, uploadedFile);
        console.log("Successfully uploaded to Firebase Storage");
      } catch (fbError) {
        console.warn("Firebase upload skipped (Check API keys):", fbError);
      }
      
      // 2. Extract Text from Document
      // For this hackathon prototype, we use FileReader to parse text documents natively.
      const extractedText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(uploadedFile);
      });
      
      setDocText(extractedText);

      // 3. Send to Google Gemini AI for Analysis
      const analysisResults = await analyzeDocumentWithAI(extractedText);
      setInsights(analysisResults);
      
    } catch (error) {
      console.error("Error processing document:", error);
    } finally {
      setIsScanning(false);
    }
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          LEXGUARD
        </div>
        <div className="nav-links">
          <span>Dashboard</span>
          <span>Integrations</span>
          <div className="avatar">JD</div>
        </div>
      </nav>

      <main className="dashboard">
        {!file ? (
          <div className="upload-panel">
            <div className="upload-content">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              <div>
                <h2 className="mono">Secure Contract Upload</h2>
                <p style={{color: 'var(--text-secondary)', marginTop: '0.5rem'}}>
                  Powered by Firebase Storage & Google Cloud AI
                </p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                style={{display: 'none'}} 
                accept=".pdf,.docx,.txt"
              />
              <button className="btn-upload" onClick={() => fileInputRef.current.click()}>
                Select Document
              </button>
            </div>
          </div>
        ) : (
          <div className="analysis-layout">
            <div className="document-viewer">
              <div className="doc-header">
                <h3 className="mono" style={{color: 'var(--text-secondary)'}}>{file.name}</h3>
                {isScanning ? (
                  <span className="mono" style={{color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div className="spinner" style={{width: '16px', height: '16px', borderWidth: '2px'}}></div>
                    AI Scanning...
                  </span>
                ) : (
                  <span className="mono" style={{color: 'var(--success)'}}>Analysis Complete</span>
                )}
              </div>
              <div className="doc-content">
                {isScanning && <div className="scanner-overlay"></div>}
                
                {/* Simulated Document Text with Highlighting */}
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {isScanning ? "Processing document text..." : docText}
                </div>

                {/* Simulated Extracted Overlay for Demo Visuals */}
                {!isScanning && insights.map((insight, idx) => (
                   <div key={idx} className="extracted-clause" data-risk={getRiskClass(insight.risk_score)} style={{marginTop: '1rem'}}>
                     <strong style={{color: 'var(--text-primary)'}}>{insight.title}</strong>
                     <p style={{marginTop: '0.5rem', color: 'var(--text-secondary)'}}>{insight.extracted_text}</p>
                   </div>
                ))}
              </div>
            </div>

            <div className="insights-sidebar">
              {isScanning ? (
                 <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)'}}>
                   <div className="spinner"></div>
                   <p className="mono" style={{marginTop: '1rem'}}>Extracting hidden liabilities...</p>
                 </div>
              ) : (
                <>
                  <div style={{padding: '0 0.5rem'}}>
                    <h2 className="mono">AI Risk Report</h2>
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Plain-language contractual implications</p>
                  </div>
                  {insights.map((insight) => (
                    <div key={insight.id} className={`insight-card ${getRiskClass(insight.risk_score)}`}>
                      <div className="insight-header">
                        <span className="insight-title">{insight.title}</span>
                        <span className={`risk-badge ${getRiskClass(insight.risk_score)}`}>
                          Risk: {insight.risk_score}/10
                        </span>
                      </div>
                      <div className="insight-explanation">
                        {insight.plain_language_explanation}
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
