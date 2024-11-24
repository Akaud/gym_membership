import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from "../context/UserContext";
import { useLocation } from 'react-router-dom';

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
    const location = useLocation();
    const selectedPlanId = location.state?.selectedPlanId || '';
    const [membershipId, setMembershipId] = useState('');
    const [membershipStatus, setMembershipStatus] = useState(null);
    const [membershipDetails, setMembershipDetails] = useState(null);
    const [fetchingMembership, setFetchingMembership] = useState(false);


    useEffect(() => {
        fetchPlans();
        fetchSubscriptions();
    }, [token]);

    useEffect(() => {
    // Initialize with the selected plan if passed through location.state
    if (selectedPlanId) {
        setNewSubscription((prev) => ({
            ...prev,
            membership_plan_id: selectedPlanId,
        }));
    }
}, [selectedPlanId]);

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

        // Fetch user and subscriptions
        const response1 = await fetch(`http://localhost:8000/verify-token/${token}`, requestOptions);
        if (response1.ok) {
            const data1 = await response1.json();
            setUserId(data1.user_id);

            // Fetch subscriptions
            const response = await fetch(`http://localhost:8000/users/${data1.user_id}/subscriptions`, requestOptions);
            if (!response.ok) {
                throw new Error('Error fetching subscriptions');
            }

            const subscriptionsData = await response.json();

            // Fetch membership plans to get durations
            const plansResponse = await fetch('http://localhost:8000/membership-plans/', requestOptions);
            if (!plansResponse.ok) {
                throw new Error('Error fetching membership plans');
            }

            const plansData = await plansResponse.json();

            // Update subscriptions with computed statuses
            const updatedSubscriptions = subscriptionsData.map(subscription => {
                const plan = plansData.find(plan => plan.id === subscription.membership_plan_id);
                if (!plan) return subscription; // Skip if no matching plan found

                const startDate = new Date(subscription.start_date);
                const durationMonths = plan.duration; // Duration in months from the plan
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + durationMonths);

                const currentDate = new Date();

                return {
                    ...subscription,
                    end_date: endDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
                    status: currentDate > endDate ? 'expired' : 'active',
                };
            });

            setSubscriptions(updatedSubscriptions);
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
        const startDate = new Date(newSubscription.start_date);  // Get start date
        const durationMonths = 1;  // Assuming 1 month for the subscription

        // Create a new date object for the end date based on start date
        const endDate = new Date(startDate);

        // Manually calculate the new month after adding the duration in months
        let newMonth = startDate.getMonth() + durationMonths; // Add 1 month
        let newYear = startDate.getFullYear();

        // If the new month exceeds 11 (December), reset to January (month 0) and adjust the year
        if (newMonth > 11) {
            newMonth = newMonth - 12;  // This will ensure it rolls over to the correct month (0 = January)
            newYear += 1;  // Increment the year
        }

        // Set the new year and month correctly
        endDate.setFullYear(newYear);
        endDate.setMonth(newMonth);  // This ensures that the month is in the valid 0-11 range for JS Date

        // Check if the end date is invalid after month adjustment
        if (endDate.getDate() !== startDate.getDate()) {
            // If the date is invalid, set to the last valid day of the month
            endDate.setDate(0);
        }

        // Format the dates as YYYY-MM-DD for backend compatibility
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');  // Convert 0-based month to 1-based
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);
        const status = "active";

        // Prepare the request
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

        // Send the subscription request
        const response = await fetch('http://localhost:8000/subscriptions/', requestOptions);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error subscribing to the plan: ${response.status} - ${errorText}`);
        }

        // Handle success
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

  const fetchMembershipStatusForAdmin = async (id) => {
    setFetchingMembership(true); // Start loading
    try {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        };

        const response = await fetch(`http://localhost:8000/subscriptions/${id}/status`, requestOptions);

        if (!response.ok) {
            if (response.status === 404) {
                setMembershipErrorMessage("Membership ID does not exist.");
            } else {
                setMembershipErrorMessage("An error occurred while fetching membership status.");
            }
            setMembershipDetails(null);
            return;
        }

        const data = await response.json();
        setMembershipDetails(data || null);
        setMembershipErrorMessage(""); // Clear error message
    } catch (error) {
        console.error("Error fetching membership status:", error);
        setMembershipErrorMessage("An unexpected error occurred.");
    } finally {
        setFetchingMembership(false); // Stop loading
    }
};

   const checkMembershipStatus = () => {
    if (!membershipId) {
        setMembershipErrorMessage("Please enter a valid membership ID.");
        setMembershipDetails(null); // Clear any previous details
        return;
    }

    if (userRole !== "admin") {
        // For members, restrict access to only their own memberships
        const membership = subscriptions.find(
            (sub) => sub.id === parseInt(membershipId, 10)
        );

        if (!membership) {
            setMembershipErrorMessage("You are not authorized to view this membership ID.");
            setMembershipDetails(null); // Clear any previous details
            return;
        }

        // If the membership is found, display its details
        setMembershipDetails(membership);
        setMembershipStatus(membership.status); // Assume `status` is part of the subscription
        setMembershipErrorMessage(""); // Clear any error message
    } else {
        // For admins, allow unrestricted access
        fetchMembershipStatusForAdmin(membershipId);
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
                                    min={new Date().toISOString().split("T")[0]} // Set today's date as the minimum
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
                            const {name, description, price, duration} = getCurrentPlanDetails(subscription);
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

                    <br/>
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
                        {/* Error message for invalid or unauthorized access */}
                        {membershipErrorMessage && (
                            <p className="has-text-danger mt-2">{membershipErrorMessage}</p>
                        )}
                        {membershipDetails && (
                            <div className="membership-details">
                                {subscriptions.map((subscription) => {
                                    const {name, price, duration} = getCurrentPlanDetails(subscription);
                                    return (
                                        <p key={subscription.id}>
                                            <strong>Plan:</strong> {name} | <strong>Status:</strong>{' '}
                                            <span
                                                className={subscription.status === 'active' ? 'has-text-success' : 'has-text-danger'}>
                        {subscription.status}
                    </span> | <strong>Duration:</strong> {duration} months | <strong>Start
                                            Date:</strong> {subscription.start_date} | <strong>End
                                            Date:</strong> {subscription.end_date}
                                        </p>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>

            )}

            {userRole === 'admin' && (
    <>
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
            {/* Error message for invalid or unauthorized access */}
            {membershipErrorMessage && (
                <p className="has-text-danger mt-2">{membershipErrorMessage}</p>
            )}
            {membershipDetails && (
                <div className="membership-details">
                    <p><strong>Status: </strong>
                        <span className={membershipDetails.status === 'active' ? 'has-text-success' : 'has-text-danger'}>
                            {membershipDetails.status}
                        </span>
                    </p>
                </div>
            )}
        </div>
    </>
)}
        </div>
    );
};

export default Subscriptions;
