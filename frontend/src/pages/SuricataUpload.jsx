import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SuricataUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(''); // Added error state

  // Helper function to validate the file extension
  const validateAndSetFile = (file) => {
    setError(''); // Clear any previous errors
    if (file) {
      if (file.name.endsWith('.rules') || file.name.endsWith('.txt')) {
        setSelectedFile(file);
      } else {
        setError('Invalid file type. Please select a .rules or .txt file.');
        setSelectedFile(null);
      }
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    validateAndSetFile(file);
    // Reset the input value so selecting the same file again triggers onChange
    if (event.target) event.target.value = ''; 
  };

  const handleDragOver = (event) => {
    event.preventDefault(); 
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      validateAndSetFile(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError('');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Upload Suricata Rules</h1>
        <button onClick={() => navigate('/suricata/rules')} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}>← Back</button>
      </div>

      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
        
        {/* Upload Method */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Upload Method:</div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="method" defaultChecked /> File Upload
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="method" /> URL Import
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="method" /> Text Paste
            </label>
          </div>
        </div>

        {/* HIDDEN FILE INPUT - Removed the strict 'accept' attribute */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          style={{ display: 'none' }} 
        />

        {/* Drag Drop Zone */}
        <div 
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{ border: `2px dashed ${error ? '#F44336' : 'var(--border-color)'}`, borderRadius: '8px', padding: '3rem', textAlign: 'center', marginBottom: '2rem', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
        >
           <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
           <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Drag & Drop rule files here</div>
           <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>or click to browse</div>
           <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Supported: .rules, .txt | Max size: 10 MB</div>
           
           {/* Display Error Message if Validation Fails */}
           {error && <div style={{ color: '#F44336', marginTop: '1rem', fontWeight: 'bold' }}>{error}</div>}
        </div>

        {/* Uploaded Files List */}
        <div style={{ marginBottom: '2rem' }}>
           <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Selected File</h3>
           
           {selectedFile ? (
             <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
               <div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span style={{ color: '#4CAF50' }}>✓</span>
                   <strong>{selectedFile.name}</strong>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                 </div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1.5rem' }}>Ready to be imported.</div>
               </div>
               <button onClick={removeFile} style={{ border: 'none', background: 'none', color: '#F44336', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
             </div>
           ) : (
             <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
               No file currently selected.
             </div>
           )}
        </div>

        {/* Import Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Import Options</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Rule Category</label>
              <select style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <option>Custom Rules</option>
                <option>DDoS Detection</option>
                <option>Malware</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
             <label><input type="checkbox" defaultChecked /> Validate rules before import</label>
             <label><input type="checkbox" defaultChecked /> Check for duplicate SIDs</label>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div>
             {selectedFile ? <strong style={{color: '#4CAF50'}}>File validated locally.</strong> : 'Awaiting file upload...'}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ padding: '0.75rem 1.5rem', border: 'none', background: '#4CAF50', color: '#fff', cursor: selectedFile ? 'pointer' : 'not-allowed', opacity: selectedFile ? 1 : 0.5, borderRadius: '4px', fontWeight: 'bold' }} disabled={!selectedFile}>Import Rules</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuricataUpload;