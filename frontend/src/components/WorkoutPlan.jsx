import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from "../context/UserContext";

const WorkoutPlans = () => {
    const [token] = useContext(UserContext);
    const [workoutPlans, setWorkoutPlans] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [selectedPlanIdForExercise, setSelectedPlanIdForExercise] = useState('');
    const [planName, setPlanName] = useState('');

    // Fetch workout plans and exercises on mount
    useEffect(() => {
        fetchWorkoutPlans();
        fetchExercises();
    }, []);

    const fetchWorkoutPlans = async () => {
        try {
            const response = await fetch('http://localhost:8000/workoutplans/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            console.log('Fetched workout plans:', data);
            if (Array.isArray(data)) {
                setWorkoutPlans(data);
            } else {
                console.error('Expected an array but received:', data);
                setWorkoutPlans([]);
            }
        } catch (error) {
            console.error('Error fetching workout plans:', error);
        }
    };

    const fetchExercises = async () => {
        try {
            const response = await fetch('http://localhost:8000/exercises/');
            const data = await response.json();
            console.log('Fetched exercises:', data);
            if (Array.isArray(data)) {
                setExercises(data);
            } else {
                console.error('Expected an array but received:', data);
                setExercises([]);
            }
        } catch (error) {
            console.error('Error fetching exercises:', error);
        }
    };

    const handleCreateWorkoutPlan = async (e) => {
        e.preventDefault();
        try {
            const newPlan = { name: planName };
            const response = await fetch('http://localhost:8000/workoutplans/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(newPlan),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setWorkoutPlans((prevPlans) => [...prevPlans, data]);
            setPlanName('');
        } catch (error) {
            console.error("Error creating workout plan", error);
        }
    };

    const handleAddExerciseToPlan = async (planId) => {
        if (!selectedExerciseId) {
            alert("Please select an exercise to add.");
            return;
        }
        try {
            await fetch(`http://localhost:8000/workoutplans/${planId}/exercises/${selectedExerciseId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            await fetchWorkoutPlans();
            setSelectedExerciseId('');
            setSelectedPlanIdForExercise('');
        } catch (error) {
            console.error("Error adding exercise to workout plan", error);
        }
    };

    const handleDeleteWorkoutPlan = async (planId) => {
        if (window.confirm("Are you sure you want to delete this workout plan? This will also remove all associated exercises.")) {
            try {
                await fetch(`http://localhost:8000/workoutplans/${planId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                setWorkoutPlans((prevPlans) => prevPlans.filter(plan => plan.id !== planId));
            } catch (error) {
                console.error("Error deleting workout plan", error);
            }
        }
    };

    const handleRemoveExerciseFromPlan = async (planId, exerciseId) => {
        if (window.confirm("Are you sure you want to remove this exercise from the workout plan?")) {
            try {
                await fetch(`http://localhost:8000/workoutplans/${planId}/exercises/${exerciseId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                await fetchWorkoutPlans();
            } catch (error) {
                console.error("Error removing exercise from workout plan", error);
            }
        }
    };

    return (
        <div className="exercise-container">
            <h2 className="exercise-title">Workout Plans</h2>

            {/* Create New Workout Plan */}
            <form onSubmit={handleCreateWorkoutPlan} className="exercise-form" style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Plan Name"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    required
                    className="form-input"
                />
                <button type="submit" className="submit-button">Create Workout Plan</button>
            </form>

            {/* List of Workout Plans */}
            <ul>
                {Array.isArray(workoutPlans) && workoutPlans.map(plan => (
                    <li key={plan.id} className="exercise-card" style={{ marginBottom: '20px' }}>
                        <h3 className="exercise-name">{plan.name}</h3>

                        {/* Button to delete the workout plan */}
                        <button
                            onClick={() => handleDeleteWorkoutPlan(plan.id)}
                            className="remove-button"
                        >
                            Delete Plan
                        </button>

                        {/* Exercises in the workout plan */}
                        <ul>
                            {plan.exercises && plan.exercises.map(({ exercise, duration, sets, repetitions }) => (
                                <li key={exercise.id} className="event-card">
                                    <span className="event-name">{exercise.name}</span>
                                    <span className="exercise-description">{exercise.description}</span>
                                    <span className="exercise-detail">
                                        Duration: {duration} mins, Sets: {sets}, Reps: {repetitions}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveExerciseFromPlan(plan.id, exercise.id)}
                                        className="remove-button"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* Add exercise button and dropdown */}
                        <div className="event-actions">
                            <button
                                onClick={() => setSelectedPlanIdForExercise(plan.id)}
                                className="submit-button"
                            >
                                +
                            </button>
                            {selectedPlanIdForExercise === plan.id && (
                                <div>
                                    <select
                                        onChange={(e) => setSelectedExerciseId(e.target.value)}
                                        value={selectedExerciseId}
                                        className="form-input"
                                    >
                                        <option value="">Select Exercise</option>
                                        {exercises.map(exercise => (
                                            <option key={exercise.id} value={exercise.id}>
                                                {exercise.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleAddExerciseToPlan(plan.id)}
                                        className="submit-button"
                                    >
                                        Add
                                    </button>
                                </div>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default WorkoutPlans;
