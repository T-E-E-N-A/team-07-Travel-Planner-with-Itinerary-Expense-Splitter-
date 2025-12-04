import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const API_URL = 'http://localhost:5000/api';

function Dashboard({ currentUser, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [newTrip, setNewTrip] = useState({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    cover_image: ''
  });

  useEffect(() => {
    fetchTrips();
  }, [currentUser]);

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips?userId=${currentUser.id}`);
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/trips`, {
        ...newTrip,
        organizer_id: currentUser.id
      });
      
      setTrips([...trips, response.data]);
      setShowCreateModal(false);
      setNewTrip({ name: '', destination: '', start_date: '', end_date: '', cover_image: '' });
      navigate(`/trip/${response.data.id}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Error creating trip. Please try again.');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <h1>Travel Planner</h1>
          <div className="header-actions">
            <span className="user-name">Hello, {currentUser.name}!</span>
            <button onClick={onLogout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="dashboard-content">
          <div className="dashboard-header-section">
            <h2>My Trips</h2>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + Create New Trip
            </button>
          </div>

          {loading ? (
            <p>Loading trips...</p>
          ) : trips.length === 0 ? (
            <div className="empty-state">
              <p>No trips yet. Create your first trip to get started!</p>
            </div>
          ) : (
            <div className="trips-grid">
              {trips.map(trip => (
                <div
                  key={trip.id}
                  className="trip-card"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  {trip.cover_image && (
                    <div className="trip-cover" style={{ backgroundImage: `url(${trip.cover_image})` }} />
                  )}
                  <div className="trip-info">
                    <h3>{trip.name}</h3>
                    <p className="trip-destination">{trip.destination || 'No destination set'}</p>
                    <p className="trip-dates">
                      {trip.start_date && trip.end_date
                        ? `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`
                        : 'Dates not set'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Trip</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTrip}>
              <div className="form-group">
                <label>Trip Name *</label>
                <input
                  type="text"
                  value={newTrip.name}
                  onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
                  required
                  placeholder="e.g., Summer Vacation 2024"
                />
              </div>
              <div className="form-group">
                <label>Destination</label>
                <input
                  type="text"
                  value={newTrip.destination}
                  onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                  placeholder="e.g., Paris, France"
                />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={newTrip.start_date}
                  onChange={(e) => setNewTrip({ ...newTrip, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={newTrip.end_date}
                  onChange={(e) => setNewTrip({ ...newTrip, end_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Cover Image URL</label>
                <input
                  type="url"
                  value={newTrip.cover_image}
                  onChange={(e) => setNewTrip({ ...newTrip, cover_image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Create Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

