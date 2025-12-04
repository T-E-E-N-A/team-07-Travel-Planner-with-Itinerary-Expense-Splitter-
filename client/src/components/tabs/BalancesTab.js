import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BalancesTab.css';

const API_URL = 'http://localhost:5000/api';

function BalancesTab({ tripId, currentUser, members }) {
  const [balances, setBalances] = useState({});
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
    fetchSettlements();
  }, [tripId]);

  const fetchBalances = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips/${tripId}/balances`);
      setBalances(response.data);
    } catch (error) {
      console.error('Error fetching balances:', error);
      const cached = localStorage.getItem(`balances_${tripId}`);
      if (cached) {
        setBalances(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSettlements = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips/${tripId}/settlements`);
      setSettlements(response.data);
    } catch (error) {
      console.error('Error fetching settlements:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading balances...</div>;
  }

  const userBalances = Object.keys(balances).map(userId => ({
    userId,
    ...balances[userId]
  }));

  const currentUserBalance = balances[currentUser.id];

  return (
    <div className="balances-tab">
      <div className="tab-header">
        <h2>Balances & Settlements</h2>
      </div>

      <div className="balance-summary">
        <h3>Your Balance</h3>
        {currentUserBalance ? (
          <div className={`user-balance-card ${currentUserBalance.net >= 0 ? 'positive' : 'negative'}`}>
            <div className="balance-amount">
              {currentUserBalance.net >= 0 ? '+' : ''}
              ${currentUserBalance.net.toFixed(2)}
            </div>
            <div className="balance-details">
              <p>You paid: <strong>${currentUserBalance.paid.toFixed(2)}</strong></p>
              <p>You owe: <strong>${currentUserBalance.owed.toFixed(2)}</strong></p>
            </div>
          </div>
        ) : (
          <p>No expenses recorded yet.</p>
        )}
      </div>

      <div className="all-balances">
        <h3>All Members' Balances</h3>
        {userBalances.length === 0 ? (
          <p>No balances to display.</p>
        ) : (
          <div className="balances-list">
            {userBalances.map(balance => (
              <div key={balance.userId} className="balance-card">
                <div className="balance-header">
                  <h4>{balance.name}</h4>
                  <span className={`balance-value ${balance.net >= 0 ? 'positive' : 'negative'}`}>
                    {balance.net >= 0 ? '+' : ''}${balance.net.toFixed(2)}
                  </span>
                </div>
                <div className="balance-breakdown">
                  <div className="breakdown-item">
                    <span>Paid:</span>
                    <span>${balance.paid.toFixed(2)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Owed:</span>
                    <span>${balance.owed.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="settlements-section">
        <h3>Simplified Settlements</h3>
        <p className="settlement-description">
          The following transactions minimize the number of payments needed to settle all debts:
        </p>
        {settlements.length === 0 ? (
          <p>No settlements needed. All balances are even!</p>
        ) : (
          <div className="settlements-list">
            {settlements.map((settlement, index) => {
              const fromMember = members.find(m => (m.user_id || m.id) === settlement.from);
              const toMember = members.find(m => (m.user_id || m.id) === settlement.to);
              return (
                <div key={index} className="settlement-card">
                  <div className="settlement-arrow">
                    <span className="from">{fromMember?.name || settlement.from}</span>
                    <span className="arrow">→</span>
                    <span className="to">{toMember?.name || settlement.to}</span>
                  </div>
                  <div className="settlement-amount">
                    ${settlement.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="algorithm-explanation">
        <h3>How It Works</h3>
        <div className="explanation-content">
          <p>
            The debt simplification algorithm uses a <strong>Min-Cash Flow</strong> approach to minimize
            the number of transactions needed to settle all debts.
          </p>
          <p>
            <strong>Algorithm Steps:</strong>
          </p>
          <ol>
            <li>Calculate net balance for each person (total paid - total owed)</li>
            <li>Separate people into creditors (positive balance) and debtors (negative balance)</li>
            <li>Use a greedy algorithm to match largest creditors with largest debtors</li>
            <li>Create transactions that minimize the total number of payments</li>
          </ol>
          <p>
            <strong>Example:</strong> If A owes B $10 and B owes C $10, the algorithm simplifies this
            to A paying C $10 directly, eliminating the need for B to be involved in the transaction.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BalancesTab;

