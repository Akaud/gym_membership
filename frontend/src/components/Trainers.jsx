import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Trainers = () => {
  const [filters, setFilters] = useState({
    minExperience: 0,
    maxExperience: 20,
    minRate: 0,
    maxRate: 100,
    specification: "",
  });

  const trainers = [
    {
      id: 1,
      name: "John",
      surname: "Smith",
      photo: "/images/john.jpg",
      age: 30,
      experience: 5,
      rate: 50,
      specification: "Certified Personal Trainer",
    },
    {
      id: 2,
      name: "Jane",
      surname: "Doe",
      photo: "/images/jane.jpg",
      age: 28,
      experience: 4,
      rate: 45,
      specification: "Yoga Instructor",
    },
    {
      id: 3,
      name: "Alice",
      surname: "Brown",
      photo: "/images/jane.jpg",
      age: 35,
      experience: 8,
      rate: 60,
      specification: "Strength Coach",
    },
    {
      id: 4,
      name: "Bob",
      surname: "Johnson",
      photo: "/images/john.jpg",
      age: 40,
      experience: 10,
      rate: 55,
      specification: "CrossFit Trainer",
    },
  ];

  // Repeat trainers to create a list of 20 for demonstration
  const trainersList = [...trainers, ...trainers, ...trainers, ...trainers, ...trainers];

  const [flipped, setFlipped] = useState(null); // Track which card is flipped
  const navigate = useNavigate();

  // Handle card flip
  const handleCardClick = (index) => {
    if (flipped === index) {
      setFlipped(null); // Unflip if the same card is clicked
    } else {
      setFlipped(index); // Flip the clicked card
    }
  };

  // Filter trainers based on criteria
  const filteredTrainers = trainersList.filter((trainer) => {
    return (
      trainer.experience >= filters.minExperience &&
      trainer.experience <= filters.maxExperience &&
      trainer.rate >= filters.minRate &&
      trainer.rate <= filters.maxRate &&
      (filters.specification === "" || trainer.specification.toLowerCase().includes(filters.specification.toLowerCase()))
    );
  });

  // Navigate to trainer profile
  const handleSeeMore = (id) => {
    navigate(`/trainer-profile/${id}`);
  };

  // Update filter values
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  return (
    <div className="trainers-container">
      <h1>Meet Our Trainers</h1>

      {/* Filter Section */}
      <div className="filters">
        <h3>Filter Trainers</h3>

        <label>Experience (min):</label>
        <input
          type="number"
          name="minExperience"
          value={filters.minExperience}
          onChange={handleFilterChange}
          min="0"
        />
        <label>Experience (max):</label>
        <input
          type="number"
          name="maxExperience"
          value={filters.maxExperience}
          onChange={handleFilterChange}
          min="0"
        />

        <label>Rate (min):</label>
        <input
          type="number"
          name="minRate"
          value={filters.minRate}
          onChange={handleFilterChange}
          min="0"
        />
        <label>Rate (max):</label>
        <input
          type="number"
          name="maxRate"
          value={filters.maxRate}
          onChange={handleFilterChange}
          min="0"
        />

        <label>Specification:</label>
        <input
          type="text"
          name="specification"
          value={filters.specification}
          onChange={handleFilterChange}
        />
      </div>

      <div className="trainers-list">
        {filteredTrainers.map((trainer, index) => (
          <div key={index} className="trainer-card" onClick={() => handleCardClick(index)}>
            <div className={`card-inner ${flipped === index ? "flipped" : ""}`}>
              {/* Front of the card */}
              <div className="card-front">
                <img
                  src={trainer.photo}
                  alt={`${trainer.name} ${trainer.surname}`}
                  className="trainer-photo"
                />
                <h3>{trainer.name} {trainer.surname}</h3>
              </div>

              {/* Back of the card */}
              <div className="card-back">
                <h3>{trainer.name} {trainer.surname}</h3>
                <p>Age: {trainer.age}</p>
                <p>Experience: {trainer.experience} years</p>
                <p>Specification: {trainer.specification}</p>
                <p>Hourly Rate: ${trainer.rate}</p>
                <button
                  className="see-more-btn"
                  onClick={() => handleSeeMore(trainer.id)}
                >
                  See More
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trainers;
