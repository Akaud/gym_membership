import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/UserContext";

const Header = ({ title }) => {
  const [token, , , , setToken] = useContext(UserContext);
  const [,setRemainingTime] = useState(null);

  useEffect(() => {
    if (!token) {
      setRemainingTime(null);
      return;
    }

    const decodeToken = (token) => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.exp ? payload.exp * 1000 : null;
      } catch {
        console.error("Invalid token format.");
        return null;
      }
    };

    const updateRemainingTime = () => {
      const expTime = decodeToken(token);
      const timeLeft = expTime - Date.now();
      setRemainingTime(timeLeft > 0 ? timeLeft : null);

      if (timeLeft <= 0) {
        handleLogout();
      }
    };

    updateRemainingTime();
    const intervalId = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(intervalId);
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
      <header>
        <div style={{
          backgroundColor: '#00d1b2',
          padding: '30px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h1 className="title" style={{color: 'black', margin: 0}}>{title}</h1>
          {token && (
              <button className="button" onClick={handleLogout} style={{marginTop: '10px'}}>
                Logout
              </button>
          )}
        </div>
      </header>
  );
};


export default Header;
