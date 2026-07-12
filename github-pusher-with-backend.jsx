import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function GitHubPusher() {
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [owner, setOwner] = useState('Teufel2211');
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('Auto push from GitHub Pusher');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  // Server Health Check
  useEffect(() => {
    checkServer();
  }, [serverUrl]);

  const checkServer = async () => {
    try {
      const response = await fetch(`${serverUrl}/health`);
      if (!response.ok) {
        setStatus({ 
          type: 'error', 
          text: 'Server nicht erreichbar. Check URL & Port!' 
        });
      }
    } catch (err) {
      setStatus({ 
        type: 'error', 
        text: `Server offline: ${err.message}` 
      });
    }
  };

  // Repos laden vom Server
  const fetchRepos = async () => {
    if (!owner) {
      setStatus({ type: 'error', text: 'Owner erforderlich' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/repos/${owner}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      const repoNames = data.repos.map(r => r.name).sort();
      setRepos(repoNames);
      setStatus({ type: 'success', text: `${repoNames.length} Repos geladen ✅` });
    } catch (err) {
      setStatus({ type: 'error', text: `Repos laden fehlgeschlagen: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Branches laden vom Server
  const fetchBranches = async () => {
    if (!selectedRepo) {
      setStatus({ type: 'error', text: 'Repo erforderlich' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `${serverUrl}/branches/${owner}/${selectedRepo}`
      );
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      const branchNames = data.branches.map(b => b.name).sort();
      setBranches(branchNames);
      setSelectedBranch(branchNames[0] || '');
      setStatus({ type: 'success', text: `${branchNames.length} Branches geladen ✅` });
    } catch (err) {
      setStatus({ type: 'error', text: `Branches laden fehlgeschlagen: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Dateien auswählen
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setStatus({ type: 'success', text: `${selectedFiles.length} Datei(en) ausgewählt ✅` });
  };

  // Zu GitHub pushen via Server
  const pushToGithub = async () => {
    if (!selectedRepo || !selectedBranch || files.length === 0) {
      setStatus({ type: 'error', text: 'Bitte ausfüllen: Repo, Branch und Dateien' });
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      const errors = [];

      for (const file of files) {
        try {
          const content = await file.text();

          const response = await fetch(`${serverUrl}/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              owner,
              repo: selectedRepo,
              branch: selectedBranch,
              file_path: file.name,
              content,
              message
            })
          });

          const data = await response.json();
          
          if (!data.success) {
            errors.push(`${file.name}: ${data.error}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push(`${file.name}: ${err.message}`);
        }
      }

      if (successCount > 0) {
        setStatus({
          type: 'success',
          text: `✅ ${successCount}/${files.length} Datei(en) gepusht! ${errors.length > 0 ? `⚠️ ${errors.length} Fehler` : ''}`
        });
        setFiles([]);
      } else {
        setStatus({
          type: 'error',
          text: `❌ Alle Push fehlgeschlagen: ${errors[0]}`
        });
      }
    } catch (err) {
      setStatus({ type: 'error', text: `❌ Unerwarteter Fehler: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              GitHub Pusher
            </h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Backend-gesicherte GitHub Integration (Kein API Key nötig!)
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Status */}
        {status && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              status.type === 'success'
                ? darkMode
                  ? 'bg-green-900/20 border border-green-500/30'
                  : 'bg-green-50 border border-green-300'
                : darkMode
                ? 'bg-red-900/20 border border-red-500/30'
                : 'bg-red-50 border border-red-300'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle className="text-green-400" size={20} />
            ) : (
              <AlertCircle className="text-red-400" size={20} />
            )}
            <span>{status.text}</span>
          </div>
        )}

        {/* Server URL */}
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
          <label className="block text-sm font-semibold mb-2">📡 Server URL</label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            onBlur={checkServer}
            placeholder="http://localhost:3001 oder https://api.example.com"
            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 focus:border-blue-500'
                : 'bg-gray-100 border-gray-300 focus:border-blue-500'
            } focus:outline-none text-sm`}
          />
          <p className="text-xs mt-1 text-gray-500">Dein Vercel/Railway Server URL</p>
        </div>

        {/* Owner */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Owner</label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 focus:border-blue-500'
                : 'bg-gray-100 border-gray-300 focus:border-blue-500'
            } focus:outline-none`}
          />
        </div>

        {/* Repos */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold">Repository</label>
            <button
              onClick={fetchRepos}
              disabled={loading}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : darkMode
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {loading ? 'Laden...' : 'Repos aktualisieren'}
            </button>
          </div>
          <select
            value={selectedRepo}
            onChange={(e) => {
              setSelectedRepo(e.target.value);
              setBranches([]);
              setSelectedBranch('');
            }}
            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 focus:border-blue-500'
                : 'bg-gray-100 border-gray-300 focus:border-blue-500'
            } focus:outline-none`}
          >
            <option value="">-- Wähle ein Repo --</option>
            {repos.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </div>

        {/* Branches */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold">Branch</label>
            <button
              onClick={fetchBranches}
              disabled={!selectedRepo || loading}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                !selectedRepo || loading
                  ? 'opacity-50 cursor-not-allowed'
                  : darkMode
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {loading ? 'Laden...' : 'Branches aktualisieren'}
            </button>
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={branches.length === 0}
            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 focus:border-blue-500'
                : 'bg-gray-100 border-gray-300 focus:border-blue-500'
            } focus:outline-none disabled:opacity-50`}
          >
            <option value="">-- Wähle einen Branch --</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        {/* Dateien */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Dateien</label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              darkMode
                ? 'border-gray-600 hover:border-blue-500 hover:bg-blue-900/10'
                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload size={32} className="text-blue-400" />
              <span className="text-sm">Dateien hier ablegen oder klicken</span>
              {files.length > 0 && (
                <span className="text-xs text-green-400">✓ {files.length} Datei(en) ausgewählt</span>
              )}
            </label>
          </div>
        </div>

        {/* Commit Message */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Commit Message</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 focus:border-blue-500'
                : 'bg-gray-100 border-gray-300 focus:border-blue-500'
            } focus:outline-none`}
          />
        </div>

        {/* Push Button */}
        <button
          onClick={pushToGithub}
          disabled={loading || !selectedRepo || !selectedBranch || files.length === 0}
          className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
            loading || !selectedRepo || !selectedBranch || files.length === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
          } text-white`}
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              Wird gepusht...
            </>
          ) : (
            <>
              <Upload size={20} />
              Zu GitHub pushen
            </>
          )}
        </button>
      </div>
    </div>
  );
}
