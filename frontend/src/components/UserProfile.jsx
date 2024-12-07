import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context/UserContext"; // Make sure you have this context set up

const UserProfile = () => {
    const [userProfile, setUserProfile] = useState(null);
    const [error, setError] = useState(null);
    const [token, , username] = useContext(UserContext); // Get the token from context

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

                const response = await fetch(`http://localhost:8000/user/${username}`, requestOptions);

                if (!response.ok) {
                    throw new Error("Failed to fetch user profile.");
                }

                const data = await response.json();
                setUserProfile(data);
            } catch (error) {
                setError(error.message);
            }
        };

        if (token && username) {
            fetchUserProfile();
        }
    }, [token, username]); // Include token and username as dependencies

    if (error) {
        return <div>{error}</div>;
    }

    if (!userProfile) {
        return <div>Loading...</div>;
    }

    const renderRoleDetails = () => {
        if (userProfile.role === "member" && userProfile.member_details) {
            return (
                <div>
                    <h3 className="title is-3">Member Details</h3>
                    <p><strong>Weight:</strong> {userProfile.member_details.weight} kg</p>
                    <p><strong>Height:</strong> {userProfile.member_details.height} cm</p>
                    <p><strong>Membership Status:</strong> {userProfile.member_details.membership_status}</p>
                </div>
            );
        }

        if (userProfile.role === "trainer" && userProfile.trainer_details) {
            return (
                <div>
                    <h3 className="title is-3">Trainer Details</h3>
                    <p><strong>Description:</strong> {userProfile.trainer_details.description}</p>
                    <p><strong>Experience:</strong> {userProfile.trainer_details.experience} years</p>
                    <p><strong>Specialization:</strong> {userProfile.trainer_details.specialization}</p>
                    <p><strong>Rating:</strong> {userProfile.trainer_details.rating} / 5</p>
                    <p><strong>Rate per Hour:</strong> ${userProfile.trainer_details.RPH}</p>
                    <p><strong>Certification:</strong> {userProfile.trainer_details.certification}</p>
                    {userProfile.trainer_details.photo && (
                        <div>
                            <strong>Photo:</strong>
                            <img
                                src={userProfile.trainer_details.photo}
                                alt="Trainer Photo"
                                style={{ width: "150px", height: "150px", objectFit: "cover" }}
                            />
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

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
            {renderRoleDetails()}
        </div>
    );
};

export default UserProfile;
