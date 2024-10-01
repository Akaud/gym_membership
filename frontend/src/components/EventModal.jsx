import React, { useState, useContext } from 'react';
import { UserContext } from "../context/UserContext";

const EventModal = ({ event, handleClose, selectedDate, handleDeleteEvent }) => {
  const [token, userRole] = useContext(UserContext);
  const [name, setName] = useState(event ? event.name : '');
  const [description, setDescription] = useState(event ? event.description : '');
  const [time, setTime] = useState(event ? event.time : '');
  const [duration, setDuration] = useState(event ? event.duration : 30);
  const [eventType, setEventType] = useState(event ? event.event_type : (userRole === 'member' ? 'private' : 'public'));
  const [isPersonalTraining, setIsPersonalTraining] = useState(event ? event.is_personal_training : false);
  const [maxParticipants, setMaxParticipants] = useState(event ? event.max_participants : 1);
  const [roomNumber, setRoomNumber] = useState(event ? event.room_number : '');
  const [trainerId, setTrainerId] = useState(event ? event.trainer_id : null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    // Validation
    if (name === '' || time === ''  || eventType === '') {
      setErrorMessage('Please fill in all required fields');
      return;
    }
    if(duration <= 15){
      setErrorMessage('Please set duration more than 15 minutes');
      return;
    }

    // Ensure 'member' cannot create public events
    const finalEventType = userRole === 'member' ? 'private' : eventType;

    const requestOptions = {
      method: event?.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        description,
        date: selectedDate,  // Use the passed selectedDate
        time,
        duration,
        event_type: finalEventType,
        is_personal_training: isPersonalTraining,
        max_participants: maxParticipants > 0 ? maxParticipants : null,
        room_number: roomNumber || null,
        trainer_id: isPersonalTraining ? trainerId : null,
      }),
    };

    const url = event?.id
      ? `http://localhost:8000/event/${event.id}`
      : 'http://localhost:8000/event';

    try {
      const response = await fetch(url, requestOptions);
      if (!response.ok) throw new Error(`Failed to ${event?.id ? 'update' : 'create'} event`);
      handleClose();  // Close modal and refresh events
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
    }
  };

  const handleDelete = () => {
    if (event?.id) {
      handleDeleteEvent(event.id); // Call the passed delete function with event id
      handleClose(); // Close the modal after deletion
    }
  };

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={handleClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{event?.id ? 'Update Event' : 'Add Event'}</p>
        </header>
        <section className="modal-card-body">
          <div className="field">
            <label className="label">Event Name</label>
            <div className="control">
              <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter event name"
                  required
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Description</label>
            <div className="control">
              <input
                  type="text"
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Event Date</label>
            <div className="control">
              <input
                  type="text"
                  className="input"
                  value={selectedDate} // Pre-filled selected date
                  readOnly
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Time</label>
            <div className="control">
              <input
                  type="time"
                  className="input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Duration (minutes)</label>
            <div className="control">
              <input
                  type="number"
                  className="input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Enter duration (min. 15)"
                  required
              />
            </div>
          </div>

          {/* Event Type Selection: Only show for non-members */}
          {userRole !== 'member' && (
              <div className="field">
                <label className="label">Event Type</label>
                <div className="control">
                  <div className="select">
                    <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              </div>
          )}

          {/* Show only if event is public */}
          {eventType === 'public' && (
              <>
                <div className="field">
                  <label className="label">Max Participants</label>
                  <div className="control">
                    <input
                        type="number"
                        className="input"
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                        placeholder="Enter max participants"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Room Number</label>
                  <div className="control">
                    <input
                        type="text"
                        className="input"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="Enter room number"
                    />
                  </div>
                </div>
              </>
          )}

          <div className="field">
            <label className="label">
              Personal Training
              <input
                  type="checkbox"
                  checked={isPersonalTraining}
                  onChange={(e) => setIsPersonalTraining(e.target.checked)}
              />
            </label>
          </div>

          {isPersonalTraining && (
              <div className="field">
                <label className="label">Trainer ID</label>
                <div className="control">
                  <input
                      type="number"
                      className="input"
                      value={trainerId}
                      onChange={(e) => setTrainerId(e.target.value)}
                      placeholder="Enter trainer ID"
                  />
                </div>
              </div>
          )}

          {errorMessage && <p className="help is-danger">{errorMessage}</p>}
        </section>
        <footer className="modal-card-foot">
          <button
              className="button is-success"
              onClick={handleSave}
              style={{marginRight: '10px'}} // Add margin to the right
          >
            Save Event
          </button>
          {event?.id && (  // Show delete button only if it's an existing event
              <button className="button is-danger" onClick={handleDelete}>
                Delete Event
              </button>
          )}
          <button
              className="button"
              onClick={handleClose}
              style={{marginLeft: '10px'}} // Add margin to the right
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EventModal;
