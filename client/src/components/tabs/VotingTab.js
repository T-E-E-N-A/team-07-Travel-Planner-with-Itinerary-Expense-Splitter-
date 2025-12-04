import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VotingTab.css';

const API_URL = 'http://localhost:5000/api';

function VotingTab({ tripId, currentUser, members, canEdit, socket }) {
  const [votes, setVotes] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVote, setNewVote] = useState({
    title: '',
    description: '',
    options: ['', '']
  });

  useEffect(() => {
    fetchVotes();
    
    if (socket) {
      socket.on('vote-created', fetchVotes);
      socket.on('vote-response', fetchVotes);
    }

    return () => {
      if (socket) {
        socket.off('vote-created');
        socket.off('vote-response');
      }
    };
  }, [tripId, socket]);

  const fetchVotes = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips/${tripId}/votes`);
      setVotes(response.data);
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const handleCreateVote = async (e) => {
    e.preventDefault();
    
    const validOptions = newVote.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options');
      return;
    }

    try {
      await axios.post(`${API_URL}/trips/${tripId}/votes`, {
        ...newVote,
        options: validOptions,
        created_by: currentUser.id
      });
      
      setShowCreateModal(false);
      setNewVote({ title: '', description: '', options: ['', ''] });
      fetchVotes();
    } catch (error) {
      console.error('Error creating vote:', error);
      alert('Error creating vote. Please try again.');
    }
  };

  const handleVote = async (voteId, option) => {
    try {
      await axios.post(`${API_URL}/votes/${voteId}/responses`, {
        user_id: currentUser.id,
        option
      });
      fetchVotes();
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Error submitting vote. Please try again.');
    }
  };

  const addOption = () => {
    setNewVote({ ...newVote, options: [...newVote.options, ''] });
  };

  const removeOption = (index) => {
    const newOptions = newVote.options.filter((_, i) => i !== index);
    if (newOptions.length >= 2) {
      setNewVote({ ...newVote, options: newOptions });
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...newVote.options];
    newOptions[index] = value;
    setNewVote({ ...newVote, options: newOptions });
  };

  const getVoteCounts = (vote) => {
    const counts = {};
    vote.options.forEach(opt => {
      counts[opt] = vote.responses?.filter(r => r.option === opt).length || 0;
    });
    return counts;
  };

  const getUserVote = (vote) => {
    return vote.responses?.find(r => r.user_id === currentUser.id);
  };

  return (
    <div className="voting-tab">
      <div className="tab-header">
        <h2>Voting</h2>
        {canEdit && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            + Create Poll
          </button>
        )}
      </div>

      {votes.length === 0 ? (
        <div className="empty-state">
          <p>No polls yet. {canEdit && 'Create your first poll to get started!'}</p>
        </div>
      ) : (
        <div className="votes-list">
          {votes.map(vote => {
            const counts = getVoteCounts(vote);
            const userVote = getUserVote(vote);
            const totalVotes = vote.responses?.length || 0;

            return (
              <div key={vote.id} className="vote-card">
                <div className="vote-header">
                  <h3>{vote.title}</h3>
                  {vote.description && <p className="vote-description">{vote.description}</p>}
                  <p className="vote-meta">
                    Created by {vote.created_by_name} • {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                  </p>
                </div>
                <div className="vote-options">
                  {vote.options.map((option, index) => {
                    const count = counts[option] || 0;
                    const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                    const isSelected = userVote?.option === option;

                    return (
                      <div
                        key={index}
                        className={`vote-option ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="option-header">
                          <button
                            onClick={() => !userVote && handleVote(vote.id, option)}
                            className={`option-button ${isSelected ? 'selected' : ''}`}
                            disabled={!!userVote}
                          >
                            {option}
                          </button>
                          {isSelected && <span className="your-vote">Your vote</span>}
                        </div>
                        <div className="vote-results">
                          <div className="vote-bar">
                            <div
                              className="vote-fill"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="vote-count">{count} votes ({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Poll</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateVote}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newVote.title}
                  onChange={(e) => setNewVote({ ...newVote, title: e.target.value })}
                  required
                  placeholder="e.g., Which hotel should we book?"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newVote.description}
                  onChange={(e) => setNewVote({ ...newVote, description: e.target.value })}
                  rows="3"
                  placeholder="Add details about this poll"
                />
              </div>
              <div className="form-group">
                <label>Options * (at least 2)</label>
                {newVote.options.map((option, index) => (
                  <div key={index} className="option-input-group">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required={index < 2}
                    />
                    {newVote.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="btn-small btn-danger"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addOption} className="btn btn-secondary">
                  + Add Option
                </button>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Create Poll</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VotingTab;

