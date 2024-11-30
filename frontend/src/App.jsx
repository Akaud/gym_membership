import React, { useContext, useState } from "react";
import Register from './components/Register.jsx';
import Header from './components/Header.jsx';
import Login from './components/Login.jsx';
import { UserContext } from "./context/UserContext";
import Schedule from './components/Schedule';
import MembershipPlans from './components/MembershipPlans';  // Component for Admin
import Subscriptions from './components/Subscriptions';  // Component for Members
import Exercises from './components/Exercises';
import WorkoutPlans from "./components/WorkoutPlan";
import { Route, Routes, Navigate } from "react-router-dom";  // Import routing components
import Footer from './components/Footer';  // Import the Footer component
import UserProfile from "./components/UserProfile";
import Trainers from './components/Trainers'; // Import Trainers component
import TrainerProfile from "./components/TrainerProfile"; 
import './styles.css';


const App = () => {
  const [token,userRole] = useContext(UserContext); // Use userRole from context
  const [isLogin, setIsLogin] = useState(true);  // State to toggle between login and register
  const [events, setEvents] = useState([]);  // State to manage events
  const [isActive, setIsActive] = useState(false); // State to manage navbar visibility

  // Function to add a new event
  const addEvent = (event) => {
    setEvents([...events, event]);
  };

  return (
      <div className="app-container">
          <Header title={"GYM MEMBERSHIP"}/>
          {token && (
              <nav className="navbar is-light is-spaced">
                  <div className="container">
                      <div className="navbar-brand">
                          {/* Brand Logo */}
                          <a className="navbar-item" href="/">
                              <img src="/favicon.ico" alt="Gym Logo" width="35" height="28"/>
                          </a>

                          {/* Hamburger Icon */}
                          <div className="navbar-burger burger" onClick={() => setIsActive(!isActive)}
                               data-target="navbarMenu">
                              <span></span>
                              <span></span>
                              <span></span>
                          </div>
                      </div>

                      <div id="navbarMenu" className={`navbar-menu ${isActive ? 'is-active' : ''}`}>
                          <div className="navbar-center"> {/* Centering wrapper */}
                              <a className="navbar-item" href="/profile">
                                  <span className="icon-text">
                                      <span className="icon">
                                          <i className="fas fa-user"></i>
                                      </span>
                                      <span>User Profile</span>
                                  </span>
                              </a>
                              {userRole !== 'trainer' && (
                                <>
                                    <a className="navbar-item" href="/membership-plans">
                                        <span className="icon-text">
                                            <span className="icon">
                                                <i className="fas fa-dollar-sign"></i>
                                            </span>
                                            <span>Membership Plans</span>
                                        </span>
                                    </a>
                                    <a className="navbar-item" href="/subscriptions">
                                        <span className="icon-text">
                                            <span className="icon">
                                                <i className="fas fa-list-alt"></i>
                                            </span>
                                            <span>Subscriptions</span>
                                        </span>
                                    </a>
                                </>
                            )}
                              <a className="navbar-item" href="/schedule">
                                  <span className="icon-text">
                                    <span className="icon">
                                      <i className="fas fa-calendar-alt"></i>
                                    </span>
                                    <span>Schedule</span>
                                  </span>
                              </a>

                              <a className="navbar-item" href="/workoutplans">
                                  <span className="icon-text">
                                    <span className="icon">
                                      <i className="fas fa-dumbbell"></i>
                                    </span>
                                    <span>Workout Plans</span>
                                  </span>
                              </a>
                              <a className="navbar-item" href="/exercises">
                                  <span className="icon-text">
                                    <span className="icon">
                                      <i className="fas fa-running"></i>
                                    </span>
                                    <span>Exercises</span>
                                  </span>
                              </a>
                              <a className="navbar-item" href="/trainers">
                                  <span className="icon-text">
                                    <span className="icon">
                                      <i className="fas fa-user-tie"></i>
                                    </span>
                                    <span>Trainers</span>
                                  </span>
                              </a>
                          </div>
                      </div>
                  </div>
              </nav>
          )}

          <div className="columns">
              <div className="column"></div>
              <div className="column m-5 is-two-thirds">
                  <Routes>
                      {!token ? (
                          <>
                              {/* Redirect to log in if not authenticated */}
                              <Route path="/" element={isLogin ? <Login toggleForm={() => setIsLogin(false)}/> :
                                  <Register toggleForm={() => setIsLogin(true)}/>}/>
                              <Route path="*" element={<Navigate to="/"/>}/>
                          </>
                      ) : (
                          <>
                              {/* Protected routes */}
                              <Route path="/membership-plans" element={userRole !== 'trainer' ? <MembershipPlans/> : <Navigate to="/schedule" />} />
                              <Route path="/subscriptions" element={userRole !== 'trainer' ? <Subscriptions/> : <Navigate to="/schedule" />} />
                              <Route path="/schedule" element={<Schedule events={events} addEvent={addEvent}/>}/>
                              {/* Redirect to schedule if authenticated */}
                              <Route path="/profile" element={<UserProfile/>}/>
                              <Route path="*" element={<Navigate to="/schedule"/>}/>
                              <Route path="/exercises" element={<Exercises />} />
                              <Route path="/workoutplans" element={<WorkoutPlans />} />
                              <Route path="/trainers" element={<Trainers />} />
                              <Route path="/trainer-profile/:id" element={<TrainerProfile />} />
                          </>
                      )}
                  </Routes>
              </div>
              <div className="column"></div>
          </div>

          <Footer/>
      </div>
  );
};

export default App;
