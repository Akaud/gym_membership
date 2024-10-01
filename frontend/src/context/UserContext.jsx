import React, { createContext, useEffect, useState } from "react";

export const UserContext = createContext();

export const UserProvider = (props) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [userRole, setUserRole] = useState(null);  // New state for storing the user role

    useEffect(() => {
        const fetchUser = async () => {
            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            };
            const response = await fetch(`http://localhost:8000/verify-token/${token}`, requestOptions);
            if (response.ok) {
                const data = await response.json();
                setUserRole(data.role);  // Set the role from the API response
            } else {
                setToken(null);
                setUserRole(null);
            }
            localStorage.setItem("token", token);
        };
        if (token) {
            fetchUser();
        }
    }, [token]);

    return (
        <UserContext.Provider value={[token, userRole, setToken]}>
            {props.children}
        </UserContext.Provider>
    );
};
