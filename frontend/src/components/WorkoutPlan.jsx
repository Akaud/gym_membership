import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from "../context/UserContext";

const WorkoutPlans = () => {
    const [token] = useContext(UserContext);
    const [workoutPlans, setWorkoutPlans] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [selectedPlanIdForExercise, setSelectedPlanIdForExercise] = useState('');
    const [planName, setPlanName] = useState('');
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [newPlanName, setNewPlanName] = useState('');
    const [activeWorkoutPlanId, setActiveWorkoutPlanId] = useState(null);
    const [exerciseLogs, setExerciseLogs] = useState({});

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

    const handleRemoveExerciseFromPlan = async (workoutPlanExerciseId) => {
    if (window.confirm("Are you sure you want to remove this exercise from the workout plan?")) {
        try {
            await fetch(`http://localhost:8000/workoutplans/exercises/${workoutPlanExerciseId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            fetchWorkoutPlans();
        } catch (error) {
            console.error("Error removing exercise from workout plan", error);
        }
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
            console.log(newPlan);
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

    const handleRenameWorkoutPlan = async (planId) => {
        try {
            const response = await fetch(`http://localhost:8000/workoutplans/${planId}?name=${newPlanName}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await fetchWorkoutPlans();
            setEditingPlanId(null);
            setNewPlanName('');
        } catch (error) {
            console.error("Error renaming workout plan", error);
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
            alert("Failed to add exercise");
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

    const handleStartWorkout = (planId) => {
        setActiveWorkoutPlanId(planId);
        setExerciseLogs({});
    };

    const handleLogExercise = async (workoutPlanExerciseId) => {
    const log = exerciseLogs[workoutPlanExerciseId];

    const isStrengthValid = log && log.sets && log.reps && log.weight;
    const isCardioValid = log && log.duration && log.distance;

    if (!isStrengthValid && !isCardioValid) {
        alert("Please fill out all fields for the exercise log.");
        return;
    }

    const body = {
        workout_plan_exercise_id: workoutPlanExerciseId,
        sets: log.sets ? Number(log.sets) : null,
        reps_per_set: log.reps_per_set ? log.reps_per_set.toString() : null,
        weight_used: log.weight ? Number(log.weight) : null,
        duration: log.duration ? Number(log.duration) : null,
        distance: log.distance ? Number(log.distance) : null,
        date: new Date().toISOString().split('T')[0],
    };

    try {
        const response = await fetch('http://localhost:8000/workout-logs/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert("Exercise log saved successfully!");

        // Clear the log inputs for the exercise
        setExerciseLogs((prevLogs) => ({
            ...prevLogs,
            [workoutPlanExerciseId]: {
                sets: '',
                reps: '',
                weight: '',
                duration: '',
                distance: '',
            },
        }));
    } catch (error) {
        console.error("Error logging exercise", error);
    }
};

    const handleInputChange = (exerciseId, field, value) => {
        setExerciseLogs((prevLogs) => ({
            ...prevLogs,
            [exerciseId]: {
                ...prevLogs[exerciseId],
                [field]: value,
            },
        }));
    };

    return (
        <div className="exercise-container">
            <h2 className="title is-2 exercise-title">Workout Plans</h2>

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
                <button type="submit" className="button is-primary">Create Workout Plan</button>
            </form>

            {/* List of Workout Plans */}
            <ul>
                {Array.isArray(workoutPlans) && workoutPlans.map(plan => (
                    <li key={plan.id} className="exercise-card" style={{ marginBottom: '20px' }}>
                        {editingPlanId === plan.id ? (
                            <div>
                                <input
                                    type="text"
                                    value={newPlanName}
                                    onChange={(e) => setNewPlanName(e.target.value)}
                                    placeholder="New Plan Name"
                                    className="form-input"
                                />
                                <button onClick={() => handleRenameWorkoutPlan(plan.id)} className="button is-primary">Save</button>
                                <button onClick={() => setEditingPlanId(null)} className="button is-secondary">Cancel</button>
                            </div>
                        ) : (
                            <div>
                                <h3 className="exercise-name">{plan.name}</h3>
                                <button onClick={() => setEditingPlanId(plan.id)} className="button is-info">Rename</button>
                            </div>
                        )}

                        <button
                            onClick={() => handleDeleteWorkoutPlan(plan.id)}
                            className="button is-danger"
                        >
                            Delete Plan
                        </button>

                        <button
                            onClick={() => handleStartWorkout(plan.id)}
                            className="button is-primary"
                        >
                            Start Workout
                        </button>

                        {/* Exercises in the workout plan */}
                        <ul>
                           {plan.exercises && plan.exercises.map(({ id: workoutPlanExerciseId, exercise }) => (
                               <li key={workoutPlanExerciseId} className="event-card">
                                   <span className="event-name">{exercise.name}</span>
                                   <span className="exercise-description">{exercise.description}</span>
                                   <button
                                       onClick={() => handleRemoveExerciseFromPlan(workoutPlanExerciseId)}
                                       className="button is-danger"
                                   >
                                       Remove Exercise
                                   </button>
                                   {activeWorkoutPlanId === plan.id && (
                                       <div>
                                           <input
                                               type="number"
                                               placeholder="Sets"
                                               value={exerciseLogs[workoutPlanExerciseId]?.sets || ''}
                                               onChange={(e) => handleInputChange(workoutPlanExerciseId, 'sets', e.target.value)}
                                               className="form-input"
                                           />
                                           <input
                                               type="number"
                                               placeholder="Reps"
                                               value={exerciseLogs[workoutPlanExerciseId]?.reps || ''}
                                               onChange={(e) => handleInputChange(workoutPlanExerciseId, 'reps', e.target.value)}
                                               className="form-input"
                                           />
                                           <input
                                               type="number"
                                               placeholder="Weight"
                                               value={exerciseLogs[workoutPlanExerciseId]?.weight || ''}
                                               onChange={(e) => handleInputChange(workoutPlanExerciseId, 'weight', e.target.value)}
                                               className="form-input"
                                           />
                                           <input
                                               type="number"
                                               placeholder="Duration (s)"
                                               value={exerciseLogs[workoutPlanExerciseId]?.duration || ''}
                                               onChange={(e) => handleInputChange(workoutPlanExerciseId, 'duration', e.target.value)}
                                               className="form-input"
                                           />
                                           <input
                                               type="number"
                                               placeholder="Distance (m)"
                                               value={exerciseLogs[workoutPlanExerciseId]?.distance || ''}
                                               onChange={(e) => handleInputChange(workoutPlanExerciseId, 'distance', e.target.value)}
                                               className="form-input"
                                           />
                                           <button
                                               onClick={() => handleLogExercise(workoutPlanExerciseId)}
                                               className="button is-primary"
                                           >
                                               Log
                                           </button>
                                       </div>
                                   )}
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