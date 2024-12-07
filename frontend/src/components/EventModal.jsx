import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from "../context/UserContext";
import { useNotification } from "../context/NotificationContext";


const EventModal = ({ event, handleClose, selectedDate, handleDeleteEvent }) => {
  const [token, userRole] = useContext(UserContext);
  const [name, setName] = useState(event ? event.name : '');
  const [description, setDescription] = useState(event ? event.description : '');
  const [time, setTime] = useState(event ? event.time : '');
  const [duration, setDuration] = useState(event ? event.duration : 30);
  const [isPersonalTraining, setIsPersonalTraining] = useState(event ? event.is_personal_training : false);
  const [maxParticipants, setMaxParticipants] = useState(event ? event.max_participants : 1);
  const [roomNumber, setRoomNumber] = useState(event ? event.room_number : '');
  const [trainerId, setTrainerId] = useState(event ? event.trainer_id : null);
  const [trainers, setTrainers] = useState([]); // Store the list of trainers
  const [errorMessage, setErrorMessage] = useState('');
  const { addNotification } = useNotification();

  const [eventType, setEventType] = useState(() => {
    if (event) return event.event_type;
    if (userRole === 'member') return 'private';
    if (userRole === 'trainer') return 'public';
    return 'public';
  });

  useEffect(() => {
    if (userRole !== 'trainer') {
      fetch('http://localhost:8000/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
        .then(response => response.json())
        .then(data => {
          const trainerList = data.filter(user => user.role === 'trainer');
          setTrainers(trainerList);
          console.log(trainerList);
        })
        .catch(error => setErrorMessage(`Error fetching trainers: ${error.message}`));
    }
  }, [userRole, token]);

  const handleSave = async () => {
    // Validation
    if (name === '') {
      setErrorMessage('Event name is required');
      return;
    }

    if (time === '') {
      setErrorMessage('Event time is required');
      return;
    }
    if (duration <= 15) {
      setErrorMessage('Please set duration more than 15 minutes');
      return;
    }

    const eventDate = new Date(selectedDate);
    const eventTime = new Date(`${selectedDate}T${time}`);
    const now = new Date();

    if (eventDate < now.setHours(0, 0, 0, 0)) {
      setErrorMessage('Event date cannot be in the past. Please select a future date.');
      return;
    }

    if (eventTime <= now) {
      setErrorMessage('Cannot create an event in the past. Please select a future date and time.');
      return;
    }

    const eventEndTime = new Date(eventTime.getTime() + duration * 60000);
    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (eventEndTime > endOfDay) {
      setErrorMessage('Event duration exceeds the current day. Please choose a shorter duration.');
      return;
    }

    // Enforce role-based event type restrictions
    const finalEventType =
      userRole === 'member' ? 'private' :
      userRole === 'trainer' ? 'public' :
      eventType; // Admin retains their selection

    const requestOptions = {
      method: event?.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        description,
        date: selectedDate,
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
      addNotification(`${event?.id ? 'Updated' : 'Created'} event`, "success");
      handleClose(); // Close modal and refresh events
    } catch (error) {
      addNotification(`Error: ${error.message}`, "error");
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
          <p className="modal-card-title">
            {userRole === 'member'
                ? (event?.id ? 'Update Private Event' : 'Add Private Event')
                : userRole === 'trainer'
                    ? (event?.id ? 'Update Public Event' : 'Add Public Event')
                    : (event?.id ? 'Update Event' : 'Add Event')}
          </p>
        </header>
        <section className="modal-card-body">
          <div className="field">
              <label className="label">Event Name<span style={{color: 'red'}}> (required)</span></label>
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

            <div className="field is-flex" style={{gap: '1rem', flexWrap: 'wrap'}}>
                <div className="field" style={{flex: '1 1 45%'}}>
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

                <div className="field" style={{flex: '1 1 45%'}}>
                    <label className="label">
                        Time <span style={{color: 'red'}}> (required)</span>
                    </label>
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
            {userRole === 'admin' && (
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
          {eventType !== 'public' && (
              <div className="field is-flex" style={{ gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">Personal Training</label>
                  <div className="control">
                    <input
                      type="checkbox"
                      style={{ width: '20px', height: '20px' }}
                      checked={isPersonalTraining}
                      onChange={(e) => setIsPersonalTraining(e.target.checked)}
                    />
                  </div>
                </div>

                {userRole === 'member' && isPersonalTraining && (
                  <div className="field" style={{ flex: 2 }}>
                    <label className="label">Select Trainer</label>
                    <div className="control">
                      <div className="select">
                        <select
                          value={trainerId}
                          onChange={(e) => setTrainerId(e.target.value)}
                        >
                          <option value="">Select a Trainer</option>
                          {trainers.map((trainer) => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.name} {trainer.surname}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          {errorMessage && (
              <p className="help is-danger" style={{fontSize: '1.5rem'}}>
                {errorMessage}
              </p>
          )}
        </section>
        <footer className="modal-card-foot" style={{flexDirection: 'column', alignItems: 'stretch'}}>
          <button
              className="button is-primary"
              onClick={handleSave}
          >
            Save Event
          </button>
          <br/>
          {event?.id && (
            <>
              <button className="button is-danger" onClick={handleDelete}>
                Delete Event
              </button>
              <div>
                <br />
              </div>
            </>
          )}
          <button
              className="button"
              onClick={handleClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EventModal;
