import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Trainers = () => {
  const [filterCriteria, setFilterCriteria] = useState("experience");
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(100);

  const trainers = [
    { id: 1, name: "John", surname: "Smith", photo: "/images/john.jpg", age: 30, experience: 5, rate: 50, specification: "Certified Personal Trainer", ratings: [5, 4, 5] },
    { id: 2, name: "Jane", surname: "Doe", photo: "/images/jane.jpg", age: 28, experience: 4, rate: 45, specification: "Yoga Instructor", ratings: [4, 5, 4] },
    { id: 3, name: "Alice", surname: "Brown", photo: "/images/jane.jpg", age: 35, experience: 8, rate: 60, specification: "Strength Coach", ratings: [5, 5, 4, 4] },
    { id: 4, name: "Bob", surname: "Johnson", photo: "/images/john.jpg", age: 40, experience: 10, rate: 55, specification: "CrossFit Trainer", ratings: [5, 4, 4] },
  ];

  const trainersList = [...trainers, ...trainers, ...trainers, ...trainers, ...trainers];

  const [flipped, setFlipped] = useState(null);
  const navigate = useNavigate();

  const handleCardClick = (index) => setFlipped(flipped === index ? null : index);

  const calculateAverageRating = (ratings) => {
    return ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : 0;
  };

  const filteredTrainers = trainersList.filter((trainer) => {
    const valueToCheck =
      filterCriteria === "experience"
        ? trainer.experience
        : filterCriteria === "rate"
        ? trainer.rate
        : filterCriteria === "age"
        ? trainer.age
        : calculateAverageRating(trainer.ratings); // Check average rating if selected
    
    return valueToCheck >= minValue && valueToCheck <= maxValue;
  });

  const handleSeeMore = (id) => navigate(`/trainer-profile/${id}`);

  return (
    <div className="trainers-container">
      <h1>Meet Our Trainers</h1>

      {/* Filter Section */}
      <div className="filters">
        <h3>Filter Trainers</h3>

        <label htmlFor="criteria">Filter by:</label>
        <select id="criteria" value={filterCriteria} onChange={(e) => setFilterCriteria(e.target.value)}>
          <option value="experience">Experience</option>
          <option value="rate">Rate</option>
          <option value="age">Age</option>
          <option value="averageRating">Average Rating</option> {/* New option */}
        </select>

        <label>Min Value:</label>
        <input
          type="number"
          value={minValue}
          onChange={(e) => setMinValue(Number(e.target.value))}
          min="0"
        />
        <label>Max Value:</label>
        <input
          type="number"
          value={maxValue}
          onChange={(e) => setMaxValue(Number(e.target.value))}
          min="0"
        />
      </div>

      <div className="trainers-list">
        {filteredTrainers.map((trainer, index) => (
          <div key={index} className="trainer-card" onClick={() => handleCardClick(index)}>
            <div className={`card-inner ${flipped === index ? "flipped" : ""}`}>
              <div className="card-front">
                <img src={trainer.photo} alt={`${trainer.name} ${trainer.surname}`} className="trainer-photo" />
                <h3>{trainer.name} {trainer.surname}</h3>
              </div>
              <div className="card-back">
                <h3>{trainer.name} {trainer.surname}</h3>
                <p>Age: {trainer.age}</p>
                <p>Experience: {trainer.experience} years</p>
                <p>Specification: {trainer.specification}</p>
                <p>Hourly Rate: ${trainer.rate}</p>
                <p>Average Rating: {calculateAverageRating(trainer.ratings).toFixed(1)} ★</p>
                <button className="see-more-btn" onClick={() => handleSeeMore(trainer.id)}>See More</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trainers;
