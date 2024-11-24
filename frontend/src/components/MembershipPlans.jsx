import React, {useContext, useEffect, useState} from 'react';
import {UserContext} from "../context/UserContext"; // Assuming you have a CSS file for styles
import { useNavigate } from 'react-router-dom';

const MembershipPlans = () => {
  const [token, userRole,,] = useContext(UserContext);
  const [plans, setPlans] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    promotion: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [isCreating, setIsCreating] = useState(false); // State to toggle creating new plan
  const navigate = useNavigate();

  // Fetch all membership plans from the API
  const fetchPlans = async () => {
    try {
      const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Include token for authentication
        },
      };
      const response = await fetch('http://localhost:8000/membership-plans/', requestOptions);
      if (!response.ok) {
        throw new Error('Error fetching membership plans');
      }
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      setErrorMessage('Could not fetch membership plans.'); // Set error message
    }
  };

  // Handle input changes for new plan
  const handleInputChange = (e) => {
    setNewPlan({
      ...newPlan,
      [e.target.name]: e.target.value,
    });
  };

  // Validate fields
  const validateFields = () => {
    if (!newPlan.name || !newPlan.price || !newPlan.duration) {
      setErrorMessage('Plan Name, Price, and Duration are required fields.');
      return false;
    }
    if (newPlan.price <= 0 || newPlan.duration <= 0 || newPlan.duration > 12) {
      setErrorMessage('Price and Duration must be greater than zero, but max = 12.');
      return false;
    }
    setErrorMessage(''); // Clear any existing error message
    return true;
  };

  // Create or update a membership plan
  const savePlan = async () => {
    if (!validateFields()) {
      return; // Stop if validation fails
    }

    try {
      const requestOptions = {
        method: isEditing ? 'PUT' : 'POST', // Use PUT if editing, otherwise POST
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Include token for authentication
        },
        body: JSON.stringify(newPlan), // Send new plan data
      };
      const url = isEditing ? `http://localhost:8000/membership-plans/${currentPlanId}/` : 'http://localhost:8000/membership-plans/';
      const response = await fetch(url, requestOptions);
      if (!response.ok) {
        throw new Error(isEditing ? 'Error updating plan' : 'Error creating plan');
      }
      const data = await response.json();

      if (isEditing) {
        // Update existing plan in state
        setPlans(plans.map(plan => (plan.id === currentPlanId ? data : plan)));
        setIsEditing(false); // Reset editing state
      } else {
        // Add new plan to state
        setPlans([...plans, data]);
      }

      setSuccessMessage(isEditing ? 'Plan updated successfully!' : 'Plan created successfully!'); // Set success message
      setTimeout(() => setSuccessMessage(''), 3000);

      setNewPlan({ name: '', description: '', price: '', duration: '', promotion: '' }); // Reset form
      setIsCreating(false);
    } catch (error) {
      setErrorMessage(isEditing ? 'Could not update membership plan.' : 'Could not create membership plan.'); // Set error message
    }
  };

  // Delete a membership plan
  const deletePlan = async (id) => {
    try {
      const requestOptions = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Include token for authentication
        },
      };
      const response = await fetch(`http://localhost:8000/membership-plans/${id}/`, requestOptions);
      if (!response.ok) {
        throw new Error('Error deleting plan');
      }
      setPlans(plans.filter((plan) => plan.id !== id)); // Remove deleted plan from state
    } catch (error) {
      setErrorMessage('Could not delete membership plan.'); // Set error message
    }
  };

  // Edit a membership plan
  const editPlan = (plan) => {
    setNewPlan(plan);
    setIsEditing(true);
    setCurrentPlanId(plan.id);
    setIsCreating(false); // Close creation state if open
  };

  // Fetch plans on component load
  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div className="container">
      <h2 className="title is-2">Membership Plans</h2>
      {userRole === 'admin' && (
      <div className="control">
        <button
            className="button is-primary"
            onClick={() => {
              setIsCreating(true); // Set to creating mode
              setIsEditing(false); // Ensure editing mode is off
              setNewPlan({name: '', description: '', price: '', duration: '', promotion: ''}); // Reset form
            }}
        >
          Create New Plan
        </button>
        <br/><br/>
      </div>
    )}
      {successMessage && (
        <div className="notification mt-3">
          {successMessage}
        </div>
      )}

      {(isCreating || isEditing) && (
      <div className="box">
        {/* Form to create new plan */}
        <form>
          <div className="field">
            <label className="label">Plan Name <span className="has-text-danger">*</span></label>
            <div className="control">
              <input
                  className="input"
                  type="text"
                  name="name"
                  placeholder="Plan Name"
                  value={newPlan.name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Description</label>
            <div className="control">
              <input
                className="input"
                type="text"
                name="description"
                placeholder="Description"
                value={newPlan.description}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Price <span className="has-text-danger">*</span></label>
            <div className="control">
              <input
                className="input"
                type="number"
                name="price"
                placeholder="Price"
                value={newPlan.price}
                onChange={handleInputChange}
                required
                min="0.01" // Minimum value to prevent zero
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Duration (months) <span className="has-text-danger">*</span></label>
            <div className="control">
              <input
                className="input"
                type="number"
                name="duration"
                placeholder="Duration (months)"
                value={newPlan.duration}
                onChange={handleInputChange}
                required
                min="1" // Minimum value of 1 month
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Promotion</label>
            <div className="control">
              <input
                className="input"
                type="text"
                name="promotion"
                placeholder="Promotion"
                value={newPlan.promotion}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="control">
            <button className="button is-primary" type="button" onClick={savePlan}>
              {isEditing ? 'Update Plan' : 'Create Plan'}
            </button>

          </div>

          {errorMessage && (
            <div className="notification is-danger mt-3">
              {errorMessage}
            </div>
          )}
        </form>
      </div>
)}
      <br/>
      <div className="columns is-multiline">
        {plans.map((plan) => (
          <div className="column is-one-third" key={plan.id}>
            <div className="card" style={{border: '2px solid #00d1b2'}}> {/* Add a border with primary color */}
              <div className="card-content" style={{textAlign: 'center'}}> {/* Center the text */}
                <h2 className="title is-4">{plan.name}</h2> {/* Primary color for the heading */}
                <p className="subtitle is-6">{plan.description}</p>
                <p className="title is-5">${plan.price}</p>
                <p className="subtitle is-6">Duration: {plan.duration} months</p>
                {plan.promotion && <p className="has-text-danger">Promotion: {plan.promotion}</p>}
              </div>

              {/* Subscribe Button - Only visible for "member" role */}
              {userRole === 'member' && (
              <footer className="card-footer">
                <button
                  className="button is-primary is-fullwidth"
                  onClick={() => navigate('/subscriptions', { state: { selectedPlanId: plan.id } })}
                >
                  Subscribe
                </button>
              </footer>
              )}

              {userRole === 'admin' && (
                  <footer className="card-footer">
                    <button
                        className="button is-small card-footer-item"
                        style={{backgroundColor: '#00d1b2', color: 'black'}}
                        onClick={() => editPlan(plan)}
                    >
                      Edit
                    </button>
                    <button className="button is-danger is-small card-footer-item"
                            onClick={() => deletePlan(plan.id)}>Delete
                    </button>
                  </footer>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for editing the plan */}
      {isEditing && (
          <div className="modal is-active">
            <div className="modal-background" onClick={() => setIsEditing(false)}></div>
            <div className="modal-content">
              <div className="box">
                <h3 className="title is-3">Edit Membership Plan</h3>
                <form>
                  <div className="field">
                    <label className="label">Plan Name <span className="has-text-danger">*</span></label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      name="name"
                      placeholder="Plan Name"
                      value={newPlan.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Description</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      name="description"
                      placeholder="Description"
                      value={newPlan.description}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Price <span className="has-text-danger">*</span></label>
                  <div className="control">
                    <input
                      className="input"
                      type="number"
                      name="price"
                      placeholder="Price"
                      value={newPlan.price}
                      onChange={handleInputChange}
                      required
                      min="0.01" // Minimum value to prevent zero
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Duration (months) <span className="has-text-danger">*</span></label>
                  <div className="control">
                    <input
                      className="input"
                      type="number"
                      name="duration"
                      placeholder="Duration (months)"
                      value={newPlan.duration}
                      onChange={handleInputChange}
                      required
                      min="1"
                      max="12"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Promotion</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      name="promotion"
                      placeholder="Promotion"
                      value={newPlan.promotion}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
          {/* Display error message */}
          {errorMessage && (
            <div className="notification is-danger mt-3">
              {errorMessage}
            </div>
          )}


                <div className="control">
                  <button className="button is-primary" type="button" onClick={savePlan}>
                    Update Plan
                  </button>
                  <button className="button" type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipPlans;
