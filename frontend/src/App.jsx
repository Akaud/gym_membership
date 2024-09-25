import React, { useContext, useState } from "react";
import Register from './components/Register.jsx';
import Header from './components/Header.jsx';
import Login from './components/Login.jsx';
import { UserContext } from "./context/UserContext";

const App = () => {
  const [token] = useContext(UserContext);
  const [isLogin, setIsLogin] = useState(true);  // State to toggle between login and register

  return (
    <div>
      <Header title={"Gym Membership"} />
      <div className="columns">
        <div className="column"></div>
        <div className="column m-5 is-two-thirds">
          {!token ? (
            <div className="columns">
              {/* Toggle between Login and Register based on state */}
              {isLogin ? (
                <Login toggleForm={() => setIsLogin(false)} />
              ) : (
                <Register toggleForm={() => setIsLogin(true)} />
              )}
            </div>
          ) : (
            <p>Welcome! You are logged in.</p>
            // <Table /> // Uncomment to show table after login
          )}
        </div>
        <div className="column"></div>
      </div>
    </div>
  );
};

export default App;
