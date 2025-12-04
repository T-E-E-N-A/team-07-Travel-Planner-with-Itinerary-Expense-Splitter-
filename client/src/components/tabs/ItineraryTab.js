import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './ItineraryTab.css';

const API_URL = 'http://localhost:5000/api';

function ItineraryTab({ tripId, currentUser, members, canEdit, isOrganizer, socket }) {
  const [activities, setActivities] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: ''
  });

  useEffect(() => {
    fetchActivities();
    
    if (socket) {
      socket.on('activity-added', fetchActivities);
      socket.on('activity-updated', fetchActivities);
      socket.on('activity-deleted', fetchActivities);
    }

    return () => {
      if (socket) {
        socket.off('activity-added');
        socket.off('activity-updated');
        socket.off('activity-deleted');
      }
    };
  }, [tripId, socket]);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips/${tripId}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Try loading from localStorage if offline
      const cached = localStorage.getItem(`activities_${tripId}`);
      if (cached) {
        setActivities(JSON.parse(cached));
      }
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/trips/${tripId}/activities`, {
        ...newActivity,
        created_by: currentUser.id,
        position: activities.length
      });
      
      setActivities([...activities, response.data]);
      setShowAddModal(false);
      setNewActivity({ title: '', description: '', date: '', time: '', location: '' });
      
      // Cache for offline
      localStorage.setItem(`activities_${tripId}`, JSON.stringify([...activities, response.data]));
    } catch (error) {
      console.error('Error adding activity:', error);
      if (error.code === 'ERR_NETWORK') {
        // Save to localStorage for offline sync
        const offlineActivity = {
          id: `offline_${Date.now()}`,
          ...newActivity,
          created_by: currentUser.id,
          position: activities.length,
          status: 'suggested',
          offline: true
        };
        const updated = [...activities, offlineActivity];
        setActivities(updated);
        localStorage.setItem(`activities_${tripId}`, JSON.stringify(updated));
        setShowAddModal(false);
        setNewActivity({ title: '', description: '', date: '', time: '', location: '' });
      } else {
        alert('Error adding activity. Please try again.');
      }
    }
  };

  const handleUpdateActivity = async (activityId, updates) => {
    try {
      await axios.put(`${API_URL}/activities/${activityId}`, updates);
      const updated = activities.map(a => a.id === activityId ? { ...a, ...updates } : a);
      setActivities(updated);
      localStorage.setItem(`activities_${tripId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    
    try {
      await axios.delete(`${API_URL}/activities/${activityId}`);
      const updated = activities.filter(a => a.id !== activityId);
      setActivities(updated);
      localStorage.setItem(`activities_${tripId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Error deleting activity:', error);
      if (error.code === 'ERR_NETWORK') {
        const updated = activities.filter(a => a.id !== activityId);
        setActivities(updated);
        localStorage.setItem(`activities_${tripId}`, JSON.stringify(updated));
      }
    }
  };

  const handleFinalize = async (activityId) => {
    if (!isOrganizer) return;
    await handleUpdateActivity(activityId, { status: 'finalized' });
  };

  const onDragEnd = (result) => {
    if (!result.destination || !canEdit) return;

    const items = Array.from(activities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setActivities(items);
    
    // Update positions
    items.forEach((item, index) => {
      if (item.position !== index) {
        handleUpdateActivity(item.id, { position: index });
      }
    });
  };

  // Group activities by date
  const activitiesByDate = {};
  activities.forEach(activity => {
    const date = activity.date || 'No Date';
    if (!activitiesByDate[date]) {
      activitiesByDate[date] = [];
    }
    activitiesByDate[date].push(activity);
  });

  const sortedDates = Object.keys(activitiesByDate).sort();

  return (
    <div className="itinerary-tab">
      <div className="tab-header">
        <h2>Itinerary</h2>
        {canEdit && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            + Add Activity
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="empty-state">
          <p>No activities yet. {canEdit && 'Add your first activity to get started!'}</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          {sortedDates.map(date => (
            <div key={date} className="date-section">
              <h3 className="date-header">{date === 'No Date' ? 'Unscheduled' : new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <Droppable droppableId={date}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="activities-list">
                    {activitiesByDate[date].map((activity, index) => (
                      <Draggable
                        key={activity.id}
                        draggableId={activity.id}
                        index={index}
                        isDragDisabled={!canEdit}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`activity-card ${activity.status} ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div className="activity-header">
                              <div {...provided.dragHandleProps} className="drag-handle">
                                {canEdit && '⋮⋮'}
                              </div>
                              <div className="activity-title-section">
                                <h4>{activity.title}</h4>
                                {activity.status === 'finalized' && (
                                  <span className="status-badge finalized">Finalized</span>
                                )}
                                {activity.status === 'suggested' && (
                                  <span className="status-badge suggested">Suggested</span>
                                )}
                              </div>
                              {canEdit && (
                                <div className="activity-actions">
                                  {isOrganizer && activity.status === 'suggested' && (
                                    <button
                                      onClick={() => handleFinalize(activity.id)}
                                      className="btn-small btn-success"
                                    >
                                      Finalize
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditingActivity(activity)}
                                    className="btn-small btn-secondary"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteActivity(activity.id)}
                                    className="btn-small btn-danger"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                            {activity.description && (
                              <p className="activity-description">{activity.description}</p>
                            )}
                            <div className="activity-details">
                              {activity.time && <span>🕐 {activity.time}</span>}
                              {activity.location && <span>📍 {activity.location}</span>}
                            </div>
                            {activity.offline && (
                              <span className="offline-indicator">Offline - will sync when online</span>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
      )}

      {showAddModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Activity</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddActivity}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  required
                  placeholder="e.g., Visit Eiffel Tower"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  rows="3"
                  placeholder="Add details about this activity"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newActivity.date}
                  onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  value={newActivity.time}
                  onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={newActivity.location}
                  onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                  placeholder="e.g., Eiffel Tower, Paris"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Add Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingActivity && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Activity</h2>
              <button className="close-btn" onClick={() => setEditingActivity(null)}>×</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateActivity(editingActivity.id, {
                title: editingActivity.title,
                description: editingActivity.description,
                date: editingActivity.date,
                time: editingActivity.time,
                location: editingActivity.location
              });
              setEditingActivity(null);
            }}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={editingActivity.title}
                  onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingActivity.description || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={editingActivity.date || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  value={editingActivity.time || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={editingActivity.location || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, location: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingActivity(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItineraryTab;

