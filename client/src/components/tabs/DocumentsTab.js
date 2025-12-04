import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DocumentsTab.css';

const API_URL = 'http://localhost:5000/api';

function DocumentsTab({ tripId, currentUser, members, canEdit }) {
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: '',
    file_path: '',
    file_type: '',
    activity_id: ''
  });

  useEffect(() => {
    fetchDocuments();
    fetchActivities();
  }, [tripId]);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips/${tripId}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      const cached = localStorage.getItem(`documents_${tripId}`);
      if (cached) {
        setDocuments(JSON.parse(cached));
      }
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips/${tripId}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you would upload to a file storage service
      // For now, we'll use a data URL or file path
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewDocument({
          ...newDocument,
          name: file.name,
          file_path: event.target.result,
          file_type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/trips/${tripId}/documents`, {
        ...newDocument,
        uploaded_by: currentUser.id
      });
      
      setDocuments([...documents, { ...newDocument, uploaded_by: currentUser.id }]);
      setShowUploadModal(false);
      setNewDocument({ name: '', file_path: '', file_type: '', activity_id: '' });
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      if (error.code === 'ERR_NETWORK') {
        // Save offline
        const offlineDoc = {
          id: `offline_${Date.now()}`,
          ...newDocument,
          uploaded_by: currentUser.id,
          offline: true
        };
        setDocuments([...documents, offlineDoc]);
        localStorage.setItem(`documents_${tripId}`, JSON.stringify([...documents, offlineDoc]));
        setShowUploadModal(false);
        setNewDocument({ name: '', file_path: '', file_type: '', activity_id: '' });
      } else {
        alert('Error uploading document. Please try again.');
      }
    }
  };

  const handleDownload = (document) => {
    if (document.file_path.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = document.file_path;
      link.download = document.name;
      link.click();
    } else {
      window.open(document.file_path, '_blank');
    }
  };

  const documentsByActivity = {};
  documents.forEach(doc => {
    const key = doc.activity_id || 'no-activity';
    if (!documentsByActivity[key]) {
      documentsByActivity[key] = [];
    }
    documentsByActivity[key].push(doc);
  });

  return (
    <div className="documents-tab">
      <div className="tab-header">
        <h2>Document Vault</h2>
        {canEdit && (
          <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
            + Upload Document
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <p>No documents yet. {canEdit && 'Upload your first document to get started!'}</p>
        </div>
      ) : (
        <div className="documents-sections">
          {Object.keys(documentsByActivity).map(key => {
            const activityDocs = documentsByActivity[key];
            const activity = key !== 'no-activity' ? activities.find(a => a.id === key) : null;

            return (
              <div key={key} className="document-section">
                <h3>{activity ? activity.title : 'General Documents'}</h3>
                <div className="documents-grid">
                  {activityDocs.map(doc => {
                    const uploadedBy = members.find(m => (m.user_id || m.id) === doc.uploaded_by);
                    return (
                      <div key={doc.id} className="document-card">
                        <div className="document-icon">
                          {doc.file_type?.includes('pdf') ? '📄' : 
                           doc.file_type?.includes('image') ? '🖼️' : '📎'}
                        </div>
                        <div className="document-info">
                          <h4>{doc.name}</h4>
                          <p className="document-meta">
                            Uploaded by {uploadedBy?.name || 'Unknown'}
                          </p>
                          {doc.offline && (
                            <span className="offline-indicator">Offline</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="btn btn-secondary"
                        >
                          Download
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Upload Document</h2>
              <button className="close-btn" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>File *</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  required
                />
                {newDocument.name && (
                  <p className="file-selected">Selected: {newDocument.name}</p>
                )}
              </div>
              <div className="form-group">
                <label>Link to Activity (optional)</label>
                <select
                  value={newDocument.activity_id}
                  onChange={(e) => setNewDocument({ ...newDocument, activity_id: e.target.value })}
                >
                  <option value="">None</option>
                  {activities.map(activity => (
                    <option key={activity.id} value={activity.id}>
                      {activity.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newDocument.name}>
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentsTab;

