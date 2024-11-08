import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const TrainerProfile = () => {
  const { id } = useParams();
  const [trainer, setTrainer] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(0);

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
      
      // Only add to comments if there's a text comment
      if (newComment) {
        setComments([...comments, { user: "Anonymous", rating: newRating, text: newComment }]);
      }

      // Reset fields
      setNewComment("");
      setNewRating(0);
    }
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
        </div>
      </div>

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
