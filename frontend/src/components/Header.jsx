import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";

const Header = ({ title }) => {
  const [token,,, setToken] = useContext(UserContext);

  const handleLogout = () => {
    setToken(null);
  };

  return (
    <div style={{ backgroundColor: '#00d1b2', padding: '30px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 className="title" style={{ color: 'black', margin: 0 }}>{title}</h1> {/* Text color and margin */}
      {token && (
        <button className="button" onClick={handleLogout} style={{ marginTop: '10px' }}>
          Logout
        </button>
      )}
    </div>
  );
};

export default Header;
