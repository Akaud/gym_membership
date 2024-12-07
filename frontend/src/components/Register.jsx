import React, { useContext, useState } from "react";
import { UserContext } from "../context/UserContext";
import ErrorMessage from "./ErrorMessage";

const Register = ({ toggleForm }) => {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [, , , , setToken] = useContext(UserContext);
  const [gender, setGender] = useState("");

  const submitRegistration = async () => {
    const userData = {
      username,
      name,
      surname,
      age: parseInt(age, 10) || 0,
      gender,
      phone,
      email,
      password,
      role,
    };

    // Add role-specific fields
    if (role === "member") {
      userData.weight = 0;
      userData.height = 0;
      userData.membership_status = "None";
    } else if (role === "trainer") {
      userData.description = "None";
      userData.experience = 0;
      userData.specialization = "None";
      userData.rating = 0;
      userData.RPH = 0;
      userData.certification = "None";
      userData.photo = "None";
    }

    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Registration failed");
      }

      // Auto-login after successful registration
      const formDetails = new URLSearchParams();
      formDetails.append("username", username);
      formDetails.append("password", password);

      const loginResponse = await fetch("http://localhost:8000/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formDetails,
      });

      if (!loginResponse.ok) {
        const loginError = await loginResponse.json();
        throw new Error(loginError.detail || "Login failed");
      }

      const loginData = await loginResponse.json();
      localStorage.setItem("token", loginData.access_token);
      setToken(loginData.access_token);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmationPassword) {
      setErrorMessage("Passwords do not match.");
    } else {
      submitRegistration();
    }
  };

  return (
    <div className="column is-half is-offset-one-quarter">
      <form
        className="box"
        onSubmit={handleSubmit}
        style={{ border: "2px solid #00d1b2", padding: "20px", borderRadius: "8px" }}
      >
        <h1 className="title has-text-centered">Register</h1>

        {/* Username */}
        <div className="field">
          <label className="label">Username</label>
          <div className="control">
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Name and Surname */}
        <div className="field is-grouped">
          <div className="control is-expanded">
            <label className="label">Name</label>
            <input
              type="text"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="control is-expanded">
            <label className="label">Surname</label>
            <input
              type="text"
              placeholder="Enter surname"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Age */}
        <div className="field">
          <label className="label">Age</label>
          <div className="control">
            <input
              type="number"
              placeholder="Enter age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Phone */}
        <div className="field">
          <label className="label">Phone</label>
          <div className="control">
            <input
              type="text"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="field">
          <label className="label">Email Address</label>
          <div className="control">
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Gender */}
        <div className="field">
          <label className="label">Gender</label>
          <div className="control">
            <div className="select">
              <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="field">
          <label className="label">Role</label>
          <div className="control">
            <label className="radio">
              <input
                type="radio"
                name="role"
                value="member"
                checked={role === "member"}
                onChange={(e) => setRole(e.target.value)}
              />{" "}
              Member
            </label>
            <br />
            <label className="radio">
              <input
                type="radio"
                name="role"
                value="trainer"
                checked={role === "trainer"}
                onChange={(e) => setRole(e.target.value)}
              />{" "}
              Trainer
            </label>
          </div>
        </div>

        {/* Password */}
        <div className="field">
          <label className="label">Password</label>
          <div className="control">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="field">
          <label className="label">Confirm Password</label>
          <div className="control">
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmationPassword}
              onChange={(e) => setConfirmationPassword(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Error Message */}
        <ErrorMessage message={errorMessage} />

        {/* Submit Button */}
        <br />
        <div className="has-text-centered">
          <button className="button is-primary" type="submit">
            Register
          </button>
        </div>

        {/* Toggle to Login */}
        <br />
        <div className="has-text-centered">
          <p>
            Already have an account?{" "}
            <a href="#" onClick={toggleForm}>
              Login here
            </a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;
