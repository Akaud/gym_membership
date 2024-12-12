import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context/UserContext";

const UserProfile = () => {
    const [userProfile, setUserProfile] = useState(null);
    const [error, setError] = useState(null);
    const [token] = useContext(UserContext);

    const [exerciseName, setExerciseName] = useState("");
    const [attribute, setAttribute] = useState("");
    const [availableAttributes, setAvailableAttributes] = useState([]);
    const [exercises, setExercises] = useState({});
    const [chartUrl, setChartUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState("");

    // Fetch user profile
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetch("http://localhost:8000/user/profile", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch user profile.");
                }

                const data = await response.json();
                setUserProfile(data);
            } catch (error) {
                setError(error.message);
            }
        };

        if (token) {
            fetchUserProfile();
        }
    }, [token]);

    // Fetch exercise info
    useEffect(() => {
        const fetchExerciseInfo = async () => {
            setLoading(true);
            setFetchError("");
            try {
                const response = await fetch("http://localhost:8000/user/logs/exercise-info", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch exercise info.");
                }

                const data = await response.json();
                setExercises(data);

                const firstExercise = Object.keys(data)[0];
                if (firstExercise) {
                    setExerciseName(firstExercise);
                    setAvailableAttributes(data[firstExercise]);
                    setAttribute(data[firstExercise][0]);
                }
            } catch (error) {
                setFetchError(error.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchExerciseInfo();
        }
    }, [token]);

    const fetchExerciseLogs = async () => {
        if (!exerciseName || typeof exerciseName !== "string") {
            setFetchError("Please provide a valid exercise name.");
            return;
        }

        setLoading(true);
        setFetchError("");

        try {
            const response = await fetch(`http://localhost:8000/exercise/${exerciseName}/logs`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch exercise logs. Status: ${response.status}`);
            }

            const logs = await response.json();

            if (!logs || logs.length === 0) {
                setFetchError("No data found for the given exercise and user.");
                setLoading(false);
                return;
            }

            const labels = logs.map((log) => log.date);
            const values = logs.map((log) => log[attribute]);

            const chartData = {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: `${exerciseName} ${attribute}`,
                            data: values,
                            fill: false,
                            borderColor: "rgba(75, 192, 192, 1)",
                            tension: 0.1,
                        },
                    ],
                },
            };

            const quickChartResponse = await fetch("https://quickchart.io/chart/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ chart: chartData }),
            });

            if (!quickChartResponse.ok) {
                throw new Error("Failed to generate chart.");
            }

            const quickChartData = await quickChartResponse.json();
            setChartUrl(quickChartData.url);
        } catch (err) {
            setFetchError("Failed to fetch data. Please check your inputs and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        fetchExerciseLogs();
    };

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!userProfile) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="app-container">
            <div className="profile-card">
                <h2 className="title is-2">My Profile</h2>
                <div className="profile-details">
                    <p><strong>Name:</strong> {userProfile.name} {userProfile.surname}</p>
                    <p><strong>Username:</strong> {userProfile.username}</p>
                    <p><strong>Email:</strong> {userProfile.email}</p>
                    <p><strong>Role:</strong> {userProfile.role}</p>
                </div>
            </div>

            <div className="exercise-container">
                <h2 className="title is-3">Your statistics</h2>
                <form className="exercise-form" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="exerciseName">Exercise Name:</label>
                        <select
                            id="exerciseName"
                            className="form-input"
                            value={exerciseName}
                            onChange={(e) => {
                                const selectedExercise = e.target.value;
                                setExerciseName(selectedExercise);
                                setAttribute("");
                                setAvailableAttributes(exercises[selectedExercise]);
                            }}
                        >
                            {Object.keys(exercises).map((exercise) => (
                                <option key={exercise} value={exercise}>
                                    {exercise}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="attribute">Attribute:</label>
                        <select
                            id="attribute"
                            className="form-input"
                            value={attribute}
                            onChange={(e) => setAttribute(e.target.value)}
                        >
                            {availableAttributes.map((attr) => (
                                <option key={attr} value={attr}>
                                    {attr.replace("_", " ").toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Get Chart"}
                    </button>
                </form>

                {fetchError && <p className="error-message">{fetchError}</p>}

                {chartUrl && (
                    <div className="chart-section">
                        <h3>Chart for {exerciseName}</h3>
                        <img src={chartUrl} alt="Exercise Log Chart" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;
