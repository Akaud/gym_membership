// src/context/NotificationContext.js
import React, { createContext, useState, useContext } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (message, type = 'error') => {
        const id = Date.now();
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Automatically remove notification after 3 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 4000);
    };

    const removeNotification = (id) => {
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <NotificationList notifications={notifications} />
        </NotificationContext.Provider>
    );
};

const NotificationList = ({ notifications }) => {
    return (
        <div style={notificationListStyle}>
            {notifications.map((notification) => (
                <div key={notification.id} style={getNotificationStyle(notification.type)}>
                    {notification.message}
                </div>
            ))}
        </div>
    );
};

const notificationListStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '1000',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
};

const getNotificationStyle = (type) => ({
    padding: '10px 20px',
    borderRadius: '5px',
    backgroundColor: type === 'error' ? '#f44336' : '#4CAF50', // Red for errors, green for success
    color: 'white',
    opacity: '0.9',
    transition: 'opacity 0.5s',
});

export const useNotification = () => {
    return useContext(NotificationContext);
};
