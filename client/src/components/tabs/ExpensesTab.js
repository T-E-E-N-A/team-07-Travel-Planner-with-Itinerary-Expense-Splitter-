import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ExpensesTab.css';

const API_URL = 'http://localhost:5000/api';

function ExpensesTab({ tripId, currentUser, members, canEdit, socket }) {
  const [expenses, setExpenses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    paid_by: currentUser.id,
    splits: []
  });
  const [baseCurrency, setBaseCurrency] = useState('USD');

  useEffect(() => {
    fetchExpenses();
    
    if (socket) {
      socket.on('expense-added', fetchExpenses);
    }

    return () => {
      if (socket) {
        socket.off('expense-added');
      }
    };
  }, [tripId, socket]);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips/${tripId}/expenses`);
      setExpenses(response.data);
      // Cache for offline
      localStorage.setItem(`expenses_${tripId}`, JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      const cached = localStorage.getItem(`expenses_${tripId}`);
      if (cached) {
        setExpenses(JSON.parse(cached));
      }
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    if (newExpense.splits.length === 0) {
      alert('Please add at least one person to split the expense with.');
      return;
    }

    const totalSplit = newExpense.splits.reduce((sum, split) => sum + parseFloat(split.amount || 0), 0);
    if (Math.abs(totalSplit - parseFloat(newExpense.amount)) > 0.01) {
      alert('Split amounts must equal the total amount.');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/trips/${tripId}/expenses`, newExpense);
      setExpenses([response.data, ...expenses]);
      setShowAddModal(false);
      setNewExpense({
        description: '',
        amount: '',
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        paid_by: currentUser.id,
        splits: []
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      if (error.code === 'ERR_NETWORK') {
        // Save offline
        const offlineExpense = {
          id: `offline_${Date.now()}`,
          ...newExpense,
          offline: true,
          splits: newExpense.splits.map(s => ({ ...s, id: `offline_split_${Date.now()}_${Math.random()}` }))
        };
        setExpenses([offlineExpense, ...expenses]);
        localStorage.setItem(`expenses_${tripId}`, JSON.stringify([offlineExpense, ...expenses]));
        setShowAddModal(false);
        setNewExpense({
          description: '',
          amount: '',
          currency: 'USD',
          date: new Date().toISOString().split('T')[0],
          paid_by: currentUser.id,
          splits: []
        });
      } else {
        alert('Error adding expense. Please try again.');
      }
    }
  };

  const addSplit = () => {
    const availableMembers = members.filter(m => {
      const memberId = m.user_id || m.id;
      return !newExpense.splits.some(s => s.user_id === memberId);
    });

    if (availableMembers.length === 0) {
      alert('All members are already added to the split');
      return;
    }

    const memberOptions = availableMembers.map((m, idx) => `${idx + 1}. ${m.name} (${m.user_id || m.id})`).join('\n');
    const selection = prompt(`Select a member to add:\n${memberOptions}\n\nEnter number or user ID:`);
    if (!selection) return;

    let selectedMember;
    const num = parseInt(selection);
    if (!isNaN(num) && num > 0 && num <= availableMembers.length) {
      selectedMember = availableMembers[num - 1];
    } else {
      selectedMember = availableMembers.find(m => (m.user_id || m.id) === selection.trim());
    }

    if (!selectedMember) {
      alert('Member not found');
      return;
    }

    const amount = prompt(`Enter amount for ${selectedMember.name}:`);
    if (!amount || isNaN(amount)) {
      alert('Invalid amount');
      return;
    }

    setNewExpense({
      ...newExpense,
      splits: [
        ...newExpense.splits,
        {
          user_id: selectedMember.user_id || selectedMember.id,
          amount: parseFloat(amount),
          percentage: null
        }
      ]
    });
  };

  const removeSplit = (index) => {
    const newSplits = newExpense.splits.filter((_, i) => i !== index);
    setNewExpense({ ...newExpense, splits: newSplits });
  };

  const calculateEqualSplit = () => {
    if (!newExpense.amount || newExpense.amount <= 0) {
      alert('Please enter an amount first');
      return;
    }

    const memberOptions = members.map((m, idx) => `${idx + 1}. ${m.name}`).join('\n');
    const selection = prompt(`Select members for equal split (comma-separated numbers):\n${memberOptions}\n\nExample: 1,2,3`);
    if (!selection) return;

    const indices = selection.split(',').map(s => parseInt(s.trim()) - 1).filter(i => !isNaN(i) && i >= 0 && i < members.length);
    if (indices.length === 0) {
      alert('Invalid selection');
      return;
    }

    const selectedMembers = indices.map(i => members[i]);
    const amountPerPerson = parseFloat(newExpense.amount) / selectedMembers.length;

    const splits = selectedMembers.map(member => ({
      user_id: member.user_id || member.id,
      amount: parseFloat(amountPerPerson.toFixed(2)),
      percentage: parseFloat(((1 / selectedMembers.length) * 100).toFixed(2))
    }));

    setNewExpense({ ...newExpense, splits });
  };

  const convertCurrency = async (amount, from, to) => {
    try {
      const response = await axios.get(`${API_URL}/currency/convert`, {
        params: { amount, from, to }
      });
      return response.data.converted;
    } catch (error) {
      console.error('Currency conversion error:', error);
      return amount;
    }
  };

  return (
    <div className="expenses-tab">
      <div className="tab-header">
        <h2>Expenses</h2>
        {canEdit && (
          <div className="header-actions">
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="currency-select"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="INR">INR</option>
            </select>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              + Add Expense
            </button>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">
          <p>No expenses yet. {canEdit && 'Add your first expense to get started!'}</p>
        </div>
      ) : (
        <div className="expenses-list">
          {expenses.map(expense => {
            const paidByMember = members.find(m => (m.user_id || m.id) === expense.paid_by);
            return (
              <div key={expense.id} className="expense-card">
                <div className="expense-header">
                  <div>
                    <h4>{expense.description}</h4>
                    <p className="expense-date">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                  <div className="expense-amount">
                    <span className="amount">{expense.currency} {parseFloat(expense.amount).toFixed(2)}</span>
                  </div>
                </div>
                <div className="expense-details">
                  <p><strong>Paid by:</strong> {paidByMember?.name || 'Unknown'}</p>
                  <div className="splits">
                    <strong>Split among:</strong>
                    <ul>
                      {expense.splits?.map((split, idx) => {
                        const member = members.find(m => (m.user_id || m.id) === split.user_id);
                        return (
                          <li key={idx}>
                            {member?.name || 'Unknown'}: {expense.currency} {parseFloat(split.amount).toFixed(2)}
                            {split.percentage && ` (${split.percentage.toFixed(1)}%)`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                {expense.offline && (
                  <span className="offline-indicator">Offline - will sync when online</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Expense</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  required
                  placeholder="e.g., Dinner at Restaurant"
                />
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select
                  value={newExpense.currency}
                  onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Paid By</label>
                <select
                  value={newExpense.paid_by}
                  onChange={(e) => setNewExpense({ ...newExpense, paid_by: e.target.value })}
                  required
                >
                  {members.map(member => (
                    <option key={member.user_id || member.id} value={member.user_id || member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Splits</label>
                <div className="splits-section">
                  <button type="button" onClick={addSplit} className="btn btn-secondary">
                    + Add Person
                  </button>
                  <button type="button" onClick={calculateEqualSplit} className="btn btn-secondary">
                    Equal Split
                  </button>
                  {newExpense.splits.map((split, index) => {
                    const member = members.find(m => (m.user_id || m.id) === split.user_id);
                    return (
                      <div key={index} className="split-item">
                        <span>{member?.name || split.user_id}: {newExpense.currency} {parseFloat(split.amount).toFixed(2)}</span>
                        <button type="button" onClick={() => removeSplit(index)} className="btn-small btn-danger">
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesTab;

