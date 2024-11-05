import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from "../context/UserContext";

const Exercises = () => {
    const [token, userRole] = useContext(UserContext);
    const [exercises, setExercises] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [muscles, setMuscles] = useState('');

    // Fetch exercises on component mount
    useEffect(() => {
        fetchExercises();
    }, []);

    // Function to fetch all exercises
    const fetchExercises = async () => {
        try {
            const response = await fetch('http://localhost:8000/exercises/');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setExercises(data);
        } catch (error) {
            console.error("Error fetching exercises:", error);
        }
    };

    // Function to add a new exercise (admin only)
    const addExercise = async (e) => {
        e.preventDefault();

        if (userRole !== 'admin') {
            console.log("Only admins can add exercises.");
            return;
        }

        try {
            const newExercise = {
                name,
                description,
                duration: parseInt(duration),
                sets: sets ? parseInt(sets) : null,
                reps: reps ? parseInt(reps) : null,
                muscles,
            };

            const response = await fetch('http://localhost:8000/exercises/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(newExercise),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const addedExercise = await response.json();
            setExercises((prevExercises) => [...prevExercises, addedExercise]);
            resetForm();
        } catch (error) {
            console.error("Error adding exercise:", error);
        }
    };

    // Function to delete an exercise (admin only)
    const deleteExercise = async (exerciseId) => {
        if (userRole !== 'admin') {
            console.log("Only admins can delete exercises.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/exercises/${exerciseId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            setExercises(exercises.filter((exercise) => exercise.id !== exerciseId));
        } catch (error) {
            console.error("Error deleting exercise:", error);
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setDuration('');
        setSets('');
        setReps('');
        setMuscles('');
    };

    return (
        <div className="exercise-container">
            <h2 className="exercise-title">Exercises</h2>

            {/* Form to add a new exercise, visible only to admins */}
            {userRole === 'admin' && (
                <form className="exercise-form" onSubmit={addExercise}>
                    <input
                        className="form-input"
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <input
                        className="form-input"
                        type="text"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <input
                        className="form-input"
                        type="number"
                        placeholder="Duration (minutes)"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                    />
                    <input
                        className="form-input"
                        type="number"
                        placeholder="Sets"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                    />
                    <input
                        className="form-input"
                        type="number"
                        placeholder="Reps"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                    />
                    <input
                        className="form-input"
                        type="text"
                        placeholder="Muscles worked"
                        value={muscles}
                        onChange={(e) => setMuscles(e.target.value)}
                    />
                    <button className="submit-button" type="submit">Add Exercise</button>
                </form>
            )}

            {/* Display list of exercises */}
            <ul>
                {exercises.map((exercise) => (
                    <li key={exercise.id} className="exercise-item">
                        <div className="exercise-card">
                            <h3 className="exercise-name">{exercise.name}</h3>
                            <p className="exercise-description">Description: {exercise.description}</p>
                            <p className="exercise-detail">Duration: {exercise.duration} minutes</p>
                            <p className="exercise-detail">Sets: {exercise.sets}</p>
                            <p className="exercise-detail">Reps: {exercise.reps}</p>
                            <p className="exercise-detail">Muscles worked: {exercise.muscles}</p>
                            {/* Remove button, visible only to admins */}
                            {userRole === 'admin' && (
                                <button className="remove-button" onClick={() => deleteExercise(exercise.id)}>
                                    Remove
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Exercises;
