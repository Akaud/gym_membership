// UserProfile.jsx

import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context/UserContext"; // Make sure you have this context set up

const UserProfile = () => {
    const [userProfile, setUserProfile] = useState(null);
    const [error, setError] = useState(null);
    const [token] = useContext(UserContext); // Get the token from context

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                 const requestOptions = {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`, // Include token for authentication
                    },
                  };
                const response = await fetch("http://localhost:8000/user/profile", requestOptions);

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

    if (error) {
        return <div>{error}</div>;
    }

    if (!userProfile) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2 className="title is-2">My Profile</h2>
            <h1><strong>{userProfile.name} {userProfile.surname}, welcome to GymMembership!</strong></h1>
            <br/>
            <p><strong>Username:</strong> {userProfile.username}</p>
            <p><strong>Email:</strong> {userProfile.email}</p>
            <p><strong>Name:</strong> {userProfile.name}</p>
            <p><strong>Surname:</strong> {userProfile.surname}</p>
            <p><strong>Role:</strong> {userProfile.role}</p>
        </div>
    );
};

export default UserProfile;
