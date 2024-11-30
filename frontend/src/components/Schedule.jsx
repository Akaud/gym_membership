import React, { useState, useEffect, useContext } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, isToday } from 'date-fns';
import EventModal from './EventModal';
import ErrorMessage from "./ErrorMessage";
import { UserContext } from "../context/UserContext";

const Schedule = () => {
  const [token, userRole,, userId,] = useContext(UserContext);
  const [events, setEvents] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekDays, setWeekDays] = useState([]);
  const [activeModal, setActiveModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, event: null, position: { x: 0, y: 0 } });

  useEffect(() => {
    const days = [...Array(7)].map((_, i) => addDays(weekStart, i));
    setWeekDays(days);
    fetchEvents();
  }, [weekStart]);

  const fetchEvents = async () => {
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    try {
      const response = await fetch('http://localhost:8000/events', requestOptions);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage("Error loading events. Please try again.");
    }
  };

  const handleAddEvent = (date) => {
    const dateOnly = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateOnly);
    setCurrentEvent(null); // Clear current event for a new event
    setActiveModal(true);
  };

 const handleUpdateEvent = (event) => {
  // Allow update only if the user is the creator or an admin
  if (event.creator_id !== userId && userRole !== 'admin') {
    return;
  }

  setSelectedDate(event.date);
  setCurrentEvent(event); // Set current event for update
  setActiveModal(true);
};

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      const requestOptions = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      try {
        const response = await fetch(`http://localhost:8000/event/${eventId}`, requestOptions);
        if (!response.ok) throw new Error("Failed to delete event");
        fetchEvents();
        setErrorMessage("");
      } catch (error) {
        setErrorMessage("Error deleting event. Please try again.");
      }
    }
  };

  const handleModalClose = () => {
    setActiveModal(false);
    fetchEvents(); // Refresh events when modal closes
    setCurrentEvent(null); // Reset current event
  };

  // Functions to show/hide tooltip
  const showTooltip = (event, e) => {
    setTooltip({
      visible: true,
      event,
      position: { x: e.pageX, y: e.pageY } // Get mouse position
    });
  };

  const hideTooltip = () => {
    setTooltip({ visible: false, event: null, position: { x: 0, y: 0 } });
  };

  const handleAssignToEvent = async (event) => {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ event_id: event.id }), // Send event ID in the body
  };

  try {
    const response = await fetch(`http://localhost:8000/events/${event.id}/book`, requestOptions);
    if (!response.ok) throw new Error("Failed to book event");

    const bookingData = await response.json();
    alert(`Successfully assigned to event: ${event.name}`);
    fetchEvents(); // Refresh events to see updated bookings
  } catch (error) {
    setErrorMessage("Error assigning to event. Please try again.");
  }
};

  return (
    <div>
      <h2 className="title is-2">Weekly Schedule</h2>
      <div className="columns is-centered">
        <button className="button is-light" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>← Previous Week</button>
        <span className="mx-4">{format(weekStart, 'MMMM yyyy')}</span>
        <button className="button is-light" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>Next Week →</button>
      </div>
      <ErrorMessage message={errorMessage} />
      <br />
      <div className="columns is-multiline">
        {weekDays.map((day) => (
            <div key={day} className={`column box day-card ${isToday(day) ? 'current-day' : ''}`}>
              <div className="day">
                <span className="day-name">{format(day, 'EEEE')}</span>
                <span className="day-date">{format(day, 'MMM d')}</span>
              </div>
              <div className="has-text-centered">
                <button className="button is-primary mt-3" onClick={() => handleAddEvent(day)}>
                  New Event
                </button>
              </div>
              <br/>
              <div className="day-events">
                {events
                    .filter((event) => isSameDay(new Date(event.date), day))
                    .filter((event) => event.event_type === 'public' || (event.event_type === 'private' && event.creator_id === userId))
                    .map((event) => (
                        <div
                            key={event.id}
                            className={`event-card ${event.event_type === 'public' ? 'public-event' : 'private-event'}`}
                            onClick={() => handleUpdateEvent(event)} // Only open the modal for allowed users
                            onMouseEnter={(e) => showTooltip(event, e)} // Show tooltip on hover
                            onMouseLeave={hideTooltip} // Hide tooltip when not hovering
                        >
                          <div className="event-name">{event.name}</div>
                          <div className="event-time">{event.time}</div>
                          {event.event_type === 'public' && (
                              <button
                                  className="button is-info mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignToEvent(event);
                                  }}
                              >
                                Assign to Event
                              </button>
                          )}
                        </div>
                    ))}
              </div>
            </div>
        ))}
      </div>
      {tooltip.visible && (
          <div className="tooltip" style={{left: tooltip.position.x, top: tooltip.position.y}}>
            <h4>{tooltip.event.name}</h4>
            <p>{tooltip.event.description}</p>
            <p>{`Date: ${tooltip.event.date}`}</p>
            <p>{`Time: ${tooltip.event.time}`}</p>
            <p>{`Duration: ${tooltip.event.duration} min`}</p>
            <p>{`Participants: ${tooltip.event.max_participants}`}</p>
            <p><strong>Type:</strong> {tooltip.event.event_type}</p> {/* New line for event type */}
          </div>
      )}
      {activeModal && (
          <EventModal
              event={currentEvent}
              selectedDate={selectedDate}
              handleClose={handleModalClose}
              handleDeleteEvent={handleDeleteEvent}
          />
      )}
    </div>
  );
};

export default Schedule;
