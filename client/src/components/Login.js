import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const API_URL = 'http://localhost:5000/api';

function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create or get user
      const response = await axios.post(`${API_URL}/users`, {
        name,
        email: email || null
      });
      
      onLogin(response.data);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('UNIQUE')) {
        // User exists, try to find by email or create with different email
        alert('User with this email already exists. Please use a different email or contact support.');
      } else {
        alert('Error creating user. Please try again.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Travel Planner</h1>
        <p className="subtitle">Collaborative Itinerary & Expense Splitter</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email (optional)</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

