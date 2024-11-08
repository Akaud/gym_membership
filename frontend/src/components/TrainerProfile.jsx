import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const TrainerProfile = () => {
  const { id } = useParams();
  const [trainer, setTrainer] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestDescription, setRequestDescription] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [requestStartTime, setRequestStartTime] = useState("");
  const [requestEndTime, setRequestEndTime] = useState("");
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(false); // State to toggle metrics dashboard


  const trainersData = [
    { id: 1, name: "John", surname: "Smith", photo: "/images/john.jpg", age: 30, experience: 5, rate: 50, specification: "Certified Personal Trainer", ratings: [5, 4, 5] },
    { id: 2, name: "Jane", surname: "Doe", photo: "/images/jane.jpg", age: 28, experience: 4, rate: 45, specification: "Yoga Instructor", ratings: [4, 5, 4] },
    // Other trainers...
  ];

  useEffect(() => {
    const trainerData = trainersData.find((trainer) => trainer.id === parseInt(id));
    setTrainer(trainerData);
    setComments([
      { user: "User1", rating: 5, text: "Great trainer, very knowledgeable!" },
      { user: "User2", rating: 4, text: "Really helpful and motivating." },
    ]);
  }, [id]);

  const handleAddRating = () => {
    if (newRating > 0) {
      const updatedRatings = [...trainer.ratings, newRating];
      setTrainer((prev) => ({ ...prev, ratings: updatedRatings }));
      
      if (newComment) {
        setComments([...comments, { user: "Anonymous", rating: newRating, text: newComment }]);
      }

      setNewComment("");
      setNewRating(0);
    }
  };

  const handleRequestPrivateTraining = (e) => {
    e.preventDefault();
    const requestData = {
      description: requestDescription,
      date: requestDate,
      startTime: requestStartTime,
      endTime: requestEndTime,
    };
    console.log("Private training request:", requestData);

    setRequestDescription("");
    setRequestDate("");
    setRequestStartTime("");
    setRequestEndTime("");
    setShowRequestForm(false);
  };

  const averageRating = trainer?.ratings.length
    ? (trainer.ratings.reduce((sum, rating) => sum + rating, 0) / trainer.ratings.length).toFixed(1)
    : "No ratings yet";

  if (!trainer) return <p>Loading...</p>;

  return (
    <div className="trainer-profile">
      <div className="profile-main">
        <img src={trainer.photo} alt={`${trainer.name} ${trainer.surname}`} className="trainer-photo-rectangle" />
        <div className="profile-details">
          <p><strong>Name:</strong> {trainer.name}</p>
          <p><strong>Surname:</strong> {trainer.surname}</p>
          <p><strong>Age:</strong> {trainer.age}</p>
          <p><strong>Experience:</strong> {trainer.experience} years</p>
          <p><strong>Specification:</strong> {trainer.specification}</p>
          <p><strong>Hourly Rate:</strong> ${trainer.rate}</p>
          <p><strong>Average Rating:</strong> {averageRating} ★</p>
          <button onClick={() => setShowRequestForm(!showRequestForm)}>
            Request Private Training
          </button>
          <button onClick={() => setShowMetricsDashboard(!showMetricsDashboard)}>
            View Metrics Dashboard
          </button>

        </div>
      </div>

      {showRequestForm && (
        <div className="request-form">
          <h3>Request Private Training</h3>
          <form onSubmit={handleRequestPrivateTraining}>
            <label>Description:</label>
            <textarea
              value={requestDescription}
              onChange={(e) => setRequestDescription(e.target.value)}
              required
            />

            <label>Date:</label>
            <input
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              required
            />

            <label>Start Time:</label>
            <input
              type="time"
              value={requestStartTime}
              onChange={(e) => setRequestStartTime(e.target.value)}
              required
            />

            <label>End Time:</label>
            <input
              type="time"
              value={requestEndTime}
              onChange={(e) => setRequestEndTime(e.target.value)}
              required
            />

            <button type="submit">Submit Request</button>
          </form>
        </div>
      )}

        {showMetricsDashboard && (
        <div className="metrics-dashboard-overlay">
          <div className="metrics-dashboard">
            <h3>Trainer Metrics</h3>
            <p>Sessions Conducted: 120</p>
            <p>Average Session Rating: {averageRating} ★</p>
            <p>Total Hours Trained: {trainer.experience * 100} hrs</p>
            <button onClick={() => setShowMetricsDashboard(false)}>Close</button>
          </div>
        </div>
      )}

      <div className="comments-section">
        <h3>Comments</h3>
        <div className="comments-list">
          {comments.map((comment, index) => (
            <p key={index}><strong>{comment.user}:</strong> {comment.text} - {comment.rating}★</p>
          ))}
        </div>
        
        <div className="add-rating">
          <h4>Add Your Rating</h4>
          <select value={newRating} onChange={(e) => setNewRating(parseInt(e.target.value))}>
            <option value={0}>Select Rating</option>
            {[1, 2, 3, 4, 5].map((star) => (
              <option key={star} value={star}>{star} ★</option>
            ))}
          </select>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment (optional)..."
          />
          <button onClick={handleAddRating}>Submit</button>
        </div>
      </div>
    </div>
  );
};

export default TrainerProfile;
