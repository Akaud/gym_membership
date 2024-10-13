import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from "../context/UserContext";

const Subscriptions = () => {
    const [token, userRole,,] = useContext(UserContext);
    const [userId, setUserId] = useState(2);
    const [subscriptions, setSubscriptions] = useState([]);
    const [plans, setPlans] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [membershipErrorMessage, setMembershipErrorMessage] = useState('');
    const [cancelConfirmationMessage, setCancelConfirmationMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [newSubscription, setNewSubscription] = useState({
        membership_plan_id: '',
        start_date: '',
    });
    const [membershipId, setMembershipId] = useState('');
    const [membershipStatus, setMembershipStatus] = useState(null);
    const [membershipDetails, setMembershipDetails] = useState(null);

    useEffect(() => {
        fetchPlans();
        fetchSubscriptions();
    }, [token]);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };
            const response1 = await fetch(`http://localhost:8000/verify-token/${token}`, requestOptions);
            if (response1.ok) {
                const data1 = await response1.json();
                setUserId(data1.user_id);
                const response = await fetch(`http://localhost:8000/users/${data1.user_id}/subscriptions`, requestOptions);
                if (!response.ok) {
                    throw new Error('Error fetching subscriptions');
                }
                const data = await response.json();
                setSubscriptions(data);
            }

        } catch (error) {
            setErrorMessage("Could not fetch subscriptions.");
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };

            const response = await fetch('http://localhost:8000/membership-plans/', requestOptions);
            if (!response.ok) {
                const errorDetails = await response.json();
                throw new Error(`Error ${response.status}: ${errorDetails.message || 'Unable to fetch membership plans.'}`);
            }

            const data = await response.json();
            setPlans(data);

        } catch (error) {
            setErrorMessage(error.message || "Could not fetch membership plans.");
        }
    };

    const subscribe = async () => {
        // Check if user already has an active subscription
        if (subscriptions.length > 0) {
            setErrorMessage("You already have an active subscription. Please cancel it before subscribing to a new plan.");
            return;
        }

        try {
            const startDate = new Date(newSubscription.start_date);
            const durationMonths = 1;

            const endDate = new Date(startDate);
            endDate.setMonth(startDate.getMonth() + durationMonths);

            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const formattedEndDate = formatDate(endDate);
            const formattedStartDate = formatDate(startDate);
            const status = "active";

            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    membership_plan_id: parseInt(newSubscription.membership_plan_id),
                    user_id: userId,
                    start_date: formattedStartDate,
                    end_date: formattedEndDate,
                    status: status
                }),
            };

            const response = await fetch('http://localhost:8000/subscriptions/', requestOptions);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error subscribing to the plan: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            setSubscriptions(prevSubscriptions => [...prevSubscriptions, data]);
            setNewSubscription({ membership_plan_id: '', start_date: '' });
            setErrorMessage('Subscribed successfully!');
            fetchSubscriptions();
        } catch (error) {
            setErrorMessage(error.message || "Error subscribing to the plan.");
        }
    };

   const cancelSubscription = async (subscriptionId) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel your current subscription?");
    if (!confirmCancel) {
        return;
    }

    try {
        const requestOptions = {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        };

        const response = await fetch(`http://localhost:8000/subscriptions/${subscriptionId}`, requestOptions);
        if (!response.ok) {
            throw new Error('Error canceling the subscription');
        }

        setSubscriptions(prevSubscriptions =>
            prevSubscriptions.filter(sub => sub.id !== subscriptionId)
        );

        // Set confirmation message for successful cancellation
        setCancelConfirmationMessage('Subscription canceled successfully!');

        // Clear the confirmation message after a few seconds
        setTimeout(() => {
            setCancelConfirmationMessage('');
        }, 5000);

        fetchSubscriptions();
    } catch (error) {
        setErrorMessage("Error canceling the subscription.");
    }
};

    const checkMembershipStatus = async () => {
    if (!membershipId) {
        setMembershipErrorMessage("Please enter a valid membership ID.");
        return;
    }

    try {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`, // Include token for authentication
            },
        };

        // Call the new endpoint to get membership status
        const response = await fetch(`http://localhost:8000/subscriptions/${membershipId}/status`, requestOptions);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error fetching membership status: ${errorText}`);
        }

        const data = await response.json();
        const membershipDetails = subscriptions.find(sub => sub.id === membershipId);
        setMembershipDetails({ ...membershipDetails, ...data });
        setMembershipStatus(data.status); // Assuming the response contains a 'status' field
        setMembershipErrorMessage(''); // Clear the error message on success
    } catch (error) {
        console.error("Error checking membership status", error);
        setMembershipErrorMessage(error.message || "Error checking membership status.");
    }
};


    const handleInputChange = (e) => {
        setNewSubscription({
            ...newSubscription,
            [e.target.name]: e.target.value,
        });
    };

    const handleMembershipIdChange = (e) => {
        setMembershipId(e.target.value);
    };

    const getCurrentPlanDetails = (subscription) => {
        const currentPlan = plans.find(plan => plan.id === subscription.membership_plan_id);
        return currentPlan ? currentPlan : { name: 'N/A', description:'N/A', duration: 'N/A', price: 'N/A' };
    };

    return (
        <div className="container">
            <h2 className="title is-2">Subscriptions</h2>
            {loading && <p>Loading subscriptions...</p>}
            {userRole !== 'admin' && (
                <>
                    <h3 className="title is-3">Subscribe to a New Plan</h3>
                    <div className="box">
                        <div className="field">
                            <label className="label">Select Membership Plan</label>
                            <div className="control">
                                <div className="select">
                                    <select
                                        name="membership_plan_id"
                                        value={newSubscription.membership_plan_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select a Plan</option>
                                        {plans.map((plan) => (
                                            <option key={plan.id} value={plan.id}>
                                                {plan.name} (${plan.price}) for {plan.duration} months
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Start Date</label>
                            <div className="control">
                                <input
                                    className="input"
                                    type="date"
                                    name="start_date"
                                    value={newSubscription.start_date}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="control">
                            <button className="button is-primary" onClick={subscribe}>
                                Subscribe
                            </button>
                        </div>

                        {errorMessage && <p className="help is-danger">{errorMessage}</p>}
                    </div>

                    <h3 className="title is-3">My Current Subscription</h3>
                    {cancelConfirmationMessage && (
        <p className="notification mt-3">{cancelConfirmationMessage}</p> // Show confirmation message
    )}
                    <ul className="list">
                        {subscriptions.map((subscription) => {
                            const { name, description, price, duration } = getCurrentPlanDetails(subscription);
                            return (
                                <li key={subscription.id} className="box" style={{position: "relative"}}>
                                    <button
                                        className="button is-danger is-small cancel-button"
                                        onClick={() => cancelSubscription(subscription.id)}
                                        style={{position: "absolute", top: "10px", right: "10px"}}
                                    >
                                        Cancel
                                    </button>
                                    <p><strong>Membership ID:</strong> {subscription.id}</p>
                                    <p><strong>{name}</strong> (${price}) for {duration} months</p>
                                    <p><strong>Description:</strong> {description}</p>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            <br />
            <h3 className="title is-3">Check Membership Status</h3>
            <div className="box">
                <div className="field">
                    <label className="label">Enter Membership ID</label>
                    <div className="control">
                        <input
                            className="input"
                            type="text"
                            value={membershipId}
                            onChange={handleMembershipIdChange}
                        />
                    </div>
                </div>

                <div className="control">
                    <button className="button is-primary" onClick={checkMembershipStatus}>
                        OK
                    </button>
                </div>
                 {membershipErrorMessage && (
        <p className="error-message">{membershipErrorMessage}</p> // Separate error message for membership check
    )}
                {membershipDetails && (
                    <div className="membership-details">
                        {subscriptions.map((subscription) => {
                            const { name, price, duration } = getCurrentPlanDetails(subscription);
                            return (
                                <p key={subscription.id}>
                                    <strong>Plan:</strong> {name} | <strong>Status:</strong> {subscription.status} | <strong>Duration:</strong> {duration} months | <strong>Start Date:</strong> {subscription.start_date} | <strong>End Date:</strong> {subscription.end_date}
                                </p>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Subscriptions;
