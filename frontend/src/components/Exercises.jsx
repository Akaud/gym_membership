import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from "../context/UserContext";

const Exercises = () => {
    const [token, userRole] = useContext(UserContext);
    const [exercises, setExercises] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [editId, setEditId] = useState(null);  // Track which exercise is being edited
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

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

        const confirmed = window.confirm("Are you sure you want to delete this exercise?");
        if (!confirmed) {
            return; // If the user cancels, do nothing
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

    // Function to start editing an exercise
    const editExercise = (exercise) => {
        setEditId(exercise.id);
        setEditName(exercise.name);
        setEditDescription(exercise.description);
    };

    // Function to update exercise (admin only)
    const updateExercise = async (e) => {
        e.preventDefault();

        if (userRole !== 'admin') {
            console.log("Only admins can update exercises.");
            return;
        }

        try {
            const updatedExercise = {
                name: editName,
                description: editDescription,
            };

            const response = await fetch(`http://localhost:8000/exercises/${editId}?name=${editName}&description=${editDescription}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updatedExercise),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const updatedData = await response.json();
            setExercises(exercises.map((exercise) =>
                exercise.id === updatedData.id ? updatedData : exercise
            ));

            setEditId(null);  // Reset edit state
        } catch (error) {
            console.error("Error updating exercise:", error);
        }
    };

    // Function to cancel editing
    const cancelEdit = () => {
        setEditId(null);  // Reset edit state
    };

    const resetForm = () => {
        setName('');
        setDescription('');
    };

    return (
        <div className="exercise-container">
            <h2 className="title is-2 exercise-title">Exercises</h2>

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

                    <button className="button is-primary" type="submit">Add Exercise</button>
                </form>
            )}

            {/* Display list of exercises */}
            <ul>
                {exercises.map((exercise) => (
                    <li key={exercise.id} className="exercise-item">
                        <div className="exercise-card">
                            {/* Display the edit form if an exercise is being edited */}
                            {editId === exercise.id ? (
                                <form onSubmit={updateExercise}>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                    />
                                    <button className="button is-success" type="submit">Update</button>
                                    <button className="button is-light" onClick={cancelEdit}>Cancel</button>
                                </form>
                            ) : (
                                <>
                                    <h3 className="exercise-name">{exercise.name}</h3>
                                    <p className="exercise-description">Description: {exercise.description}</p>
                                    <br />
                                    {/* Edit button, visible only to admins */}
                                    {userRole === 'admin' && (
                                        <button className="button is-info" onClick={() => editExercise(exercise)}>
                                            Edit
                                        </button>
                                    )}

                                    {/* Remove button, visible only to admins */}
                                    {userRole === 'admin' && (
                                        <button className="button is-danger" onClick={() => deleteExercise(exercise.id)}>
                                            Delete
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Exercises;
