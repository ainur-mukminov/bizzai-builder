import { useState, useEffect } from 'react'
import './App.css'

interface ScanHistory {
  id: number
  target: string
  created_at: string
}

function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan')
  const [target, setTarget] = useState('')
  const [selectedScanners, setSelectedScanners] = useState<string[]>(['nmap'])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<ScanHistory[]>([])
  const [selectedScan, setSelectedScan] = useState<ScanHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (activeTab === 'history' && history.length === 0) {
      loadHistory()
    }
  }, [activeTab])

  const loadHistory = async () => {
    setLoadingHistory(true)
    setError('')
    try {
      const response = await fetch('http://127.0.0.1:8081/scans')
      const data = await response.json()
      setHistory(data)
    } catch (err) {
      setError('Failed to load scan history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleScan = async () => {
    if (!target.trim()) {
      setError('Please enter a target')
      return
    }

    setScanning(true)
    setError('')
    setResult('')

    try {
      const scanPromises = selectedScanners.map(scannerType => 
        fetch('http://127.0.0.1:8081/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            target: target.trim(), 
            scanner_type: scannerType 
          }),
        })
      )

      const responses = await Promise.all(scanPromises)
      const results = await Promise.all(responses.map(res => res.json()))

      const outputs = results
        .filter(res => res.success)
        .map((res, index) => 
          `=== ${selectedScanners[index].toUpperCase()} SCAN ===\n${res.output || 'No output'}`
        )

      if (outputs.length > 0) {
        setResult(outputs.join('\n\n'))
        loadHistory()
      } else {
        setError('All scans failed')
      }
    } catch (err) {
      setError('Failed to connect to API. Make sure backend is running on port 8081')
    } finally {
      setScanning(false)
    }
  }

  const viewScanDetails = async (scan: ScanHistory) => {
    setError('')
    try {
      const response = await fetch(`http://127.0.0.1:8081/scan/${scan.id}`)
      const data = await response.json()
      if (response.ok) {
        setSelectedScan(scan)
        setResult(data.output || 'No details available')
      } else {
        setError(data || 'Scan not found')
      }
    } catch (err) {
      setError('Failed to load scan details')
    }
  }

  const exportReport = () => {
    if (!result || !target) return
    
    const blob = new Blob([`BIZZI AI Builder Report\n========================\nTarget: ${target}\nDate: ${new Date().toISOString()}\n\nResults:\n${result}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bizzai-report-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearResult = () => {
    setResult('')
    setSelectedScan(null)
  }

  const toggleScanner = (scanner: string) => {
    setSelectedScanners(prev => 
      prev.includes(scanner) 
        ? prev.filter(s => s !== scanner)
        : [...prev, scanner]
    )
  }

  const scanners = [
    { id: 'nmap', name: 'NMAP', icon: '🔍', desc: 'Port Scan' },
    { id: 'nikto', name: 'NIKTO', icon: '🛡️', desc: 'Web Vulns' },
    { id: 'sqlmap', name: 'SQLMAP', icon: '💉', desc: 'SQL Inject' },
    { id: 'whatweb', name: 'WHAT', icon: '🌐', desc: 'Tech Detect' },
  ]

  return (
    <div className="app">
      <div className="header">
        <div className="brand">
          <div className="logo">BIZZI</div>
          <div className="subtitle">AI BUILDER 2.0</div>
        </div>
        <div className="tagline">Professional Ethical Pentest Automation Tool</div>
      </div>

      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => setActiveTab('scan')}
        >
          <span className="tab-icon">🚀</span>
          SCAN
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📜</span>
          HISTORY
        </button>
      </div>

      {activeTab === 'scan' && (
        <div className="content">
          <div className="card">
            <div className="scanners-grid">
              {scanners.map(scanner => (
                <button
                  key={scanner.id}
                  className={`scanner-tag ${selectedScanners.includes(scanner.id) ? 'active' : ''}`}
                  onClick={() => toggleScanner(scanner.id)}
                  disabled={scanning}
                >
                  <span className="scanner-icon">{scanner.icon}</span>
                  <div className="scanner-name">{scanner.name}</div>
                  <div className="scanner-desc">{scanner.desc}</div>
                </button>
              ))}
            </div>

            <div className="input-section">
              <input
                type="text"
                placeholder="Enter target URL or IP (e.g., scanme.nmap.org)"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={scanning}
              />
              <button 
                className="primary-btn" 
                onClick={handleScan} 
                disabled={scanning || selectedScanners.length === 0}
              >
                {scanning ? (
                  <span className="btn-loading">
                    <span className="spinner"></span>
                    SCANNING...
                  </span>
                ) : 'START SCAN'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            
            {result && (
              <div className="result-card card">
                <div className="result-header">
                  <h3>SCAN RESULTS</h3>
                  <div className="result-actions">
                    <button onClick={exportReport} className="icon-btn export-btn">
                      <span>📥</span> EXPORT
                    </button>
                    <button onClick={clearResult} className="icon-btn close-btn">
                      <span>×</span>
                    </button>
                  </div>
                </div>
                <pre className="result-output">{result}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="content">
          <div className="card">
            <div className="history-header">
              <h2>SCAN HISTORY</h2>
              <button onClick={loadHistory} disabled={loadingHistory} className="refresh-btn">
                {loadingHistory ? '🔄' : '⟳'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loadingHistory ? (
              <div className="loading-state">
                <div className="spinner-large"></div>
                <p>Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No scans yet. Start your first scan!</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((scan) => (
                  <div key={scan.id} className="history-item">
                    <div className="history-item-content">
                      <div className="history-target">{scan.target}</div>
                      <div className="history-time">{scan.created_at}</div>
                    </div>
                    <button
                      onClick={() => viewScanDetails(scan)}
                      className="view-btn"
                    >
                      VIEW
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedScan && result && (
              <div className="result-modal card">
                <div className="result-header">
                  <h3>SCAN DETAILS</h3>
                  <div className="result-subtitle">
                    {selectedScan.target} • {selectedScan.created_at}
                  </div>
                  <div className="result-actions">
                    <button onClick={exportReport} className="icon-btn export-btn">
                      <span>📥</span> EXPORT
                    </button>
                    <button onClick={clearResult} className="icon-btn close-btn">
                      <span>×</span>
                    </button>
                  </div>
                </div>
                <pre className="result-output">{result}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <span className="creator">Created by Ainur Mukminov</span>
          <span className="copyright">© 2026 BIZZI AI Builder</span>
        </div>
      </footer>
    </div>
  )
}

export default App
