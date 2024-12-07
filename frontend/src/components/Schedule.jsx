import React, { useState, useEffect, useContext } from 'react';
import {format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, isToday, parse, addMinutes} from 'date-fns';
import EventModal from './EventModal';
import { UserContext } from "../context/UserContext";
import { useNotification } from "../context/NotificationContext";


const Schedule = () => {
  const [token, userRole,, userId,] = useContext(UserContext);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekDays, setWeekDays] = useState([]);
  const [activeModal, setActiveModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, event: null, position: { x: 0, y: 0 } });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { addNotification } = useNotification();


  useEffect(() => {
    fetchEvents();
    fetchBookings();
    const days = [...Array(7)].map((_, i) => addDays(weekStart, i));
    setWeekDays(days);
  }, [weekStart]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
      addNotification("Fetched events successfully!", "success");
    } catch (error) {
      addNotification("Error loading events. Please try again.", "error");
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
        addNotification(`Deleted event`, "success");
        await fetchEvents();
      } catch (error) {
        addNotification("Error deleting event. Please try again.", "error");
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

   const fetchBookings = async () => {
  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    // Step 1: Fetch bookings
    const response = await fetch('http://localhost:8000/bookings', requestOptions);
    if (!response.ok) throw new Error("Failed to fetch bookings");
    const bookings = await response.json();

    // Step 2: Fetch user data for each booking
    const bookingsWithUsers = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const userResponse = await fetch(`http://localhost:8000/user/id/${booking.user_id}/`, requestOptions);
          if (!userResponse.ok) throw new Error("Failed to fetch user");
          const userData = await userResponse.json();
          return { ...booking, user: userData }; // Merge user data into the booking
        } catch (userError) {
          addNotification(`Error fetching user for booking ${booking.id}:`, "error");
          return { ...booking, user: null }; // Handle case where user data couldn't be fetched
        }
      })
    );
    setBookings(bookingsWithUsers);
  } catch (error) {
    addNotification(`Error fetching bookings ${error}:`, "error");
  }
};
  const getUserBookingStatus = (eventId) => {
    const booking = bookings.find(booking => booking.event_id === eventId && booking.user_id === userId);
    if (!booking) return "Book"; // No booking
    return booking.status ? "Accepted" : "Pending"; // If status is true, it's accepted, otherwise it's pending
  };
  const handleCancelBooking = async (bookingId) => {
    const isConfirmed = window.confirm("Are you sure you want to cancel your booking for this event?");

    if (!isConfirmed) {
      return; // If the user cancels the confirmation, do nothing
    }
    const requestOptions = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      const response = await fetch(`http://localhost:8000/bookings/${bookingId}/cancel`, requestOptions);
      if (!response.ok) throw new Error("Failed to cancel booking");
      const result = await response.json();
      alert(result.message);
      await fetchBookings();
      await fetchEvents();
    } catch (error) {
      addNotification("Error canceling booking. Please try again.", "error");
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    const requestOptions = {
      method: 'PATCH',  // Assuming PATCH is used to update the status
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      const response = await fetch(`http://localhost:8000/bookings/${bookingId}/accept`, requestOptions);
      if (!response.ok) throw new Error("Failed to accept booking");
      await fetchBookings();
      await fetchEvents();
      alert("Booking accepted!");
    } catch (error) {
      addNotification("Error accepting booking. Please try again.", "error");
    }
  };

  const handleAssignToEvent = async (event) => {
    const bookingStatus = getUserBookingStatus(event.id);
    if (bookingStatus === "Pending") {
      alert("Your booking request is pending. Please wait until it is accepted.");
      return;
    }
    if (bookingStatus === "Accepted") {
      alert("You have already been accepted for this event.");
      return;
    }

    // If no booking, create a booking request
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId, event_id: event.id })
    };

    try {
      const response = await fetch(`http://localhost:8000/events/${event.id}/pend`, requestOptions);
      if (!response.ok) throw new Error("Failed to request booking for event");

      await response.json();
      alert(`Booking request sent for event: ${event.name}. Please wait for approval.`);
      await fetchEvents();
      await fetchBookings(); // Refresh bookings to reflect the new request
    } catch (error) {
      addNotification("Error assigning to event. Please try again.", "error");
    }
  };

  return (
    <div>
      <h2 className="title is-2">Weekly Schedule</h2>
      {userRole === "trainer" && (
        <button className="button is-light" onClick={toggleSidebar}>
          {isSidebarOpen ? "Close Requests" : "View Incoming Requests"}
        </button>
      )}

      {/* Sidebar section */}
      {isSidebarOpen && (
        <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <h2>Incoming Requests</h2>
          <div className="bookings-list">
            {bookings
              .filter(booking => booking.status === false && booking.trainer_id === userId)
              .map((booking) => {
                const event = events.find(event => event.id === booking.event_id);
                const currentParticipants = event ? event.current_participants : 0;

                // Get the username from the booking data (assuming the user data is part of the booking object)
                const username = booking.user ? booking.user.username : "Unknown user"; // Default value if no user data

                return (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-info">
                      <div className="event-name">{event ? event.name : "Event not found"}</div>
                      <div className="event-participants">
                        {event ? `${currentParticipants}/${event.max_participants} participants` : ""}
                      </div>
                      {/* Add the username */}
                      <div className="user-name">Booked by: {username}</div>
                    </div>
                    <div className="booking-actions">
                      <button className="button is-success" onClick={() => handleAcceptBooking(booking.id)}>
                        Accept
                      </button>
                      <button className="button is-danger" onClick={() => handleCancelBooking(booking.id)}>
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      )}

      {/* Main schedule content */}
      <div className="columns is-centered">
        <button className="button is-light" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>← Previous Week</button>
        <span className="mx-4">{format(weekStart, 'MMMM yyyy')}</span>
        <button className="button is-light" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>Next Week →</button>
      </div>
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
            <br />
            <div className="day-events">
              {events
                .filter((event) => isSameDay(new Date(event.date), day))
                .map((event) => (
                    <div
                        key={event.id}
                        className={`event-card ${event.event_type === 'public' ? 'public-event' : 'private-event'}`}
                        onMouseEnter={(e) => showTooltip(event, e)}
                        onMouseLeave={hideTooltip}
                        onClick={() => handleUpdateEvent(event)}
                    >
                      <div className="event-name">{event.name}</div>
                      <div className="event-location">{event.room_number}</div>

                      <p>
                        {`${format(parse(event.time, 'HH:mm:ss', new Date()), 'HH:mm')} - ${format(addMinutes(parse(event.time, 'HH:mm:ss', new Date()), event.duration), 'HH:mm')}`}
                      </p>
                      {event.event_type === 'public' && (
                          <div className="participants">
                            <span>{event.current_participants} / {event.max_participants}</span>
                          </div>
                      )}
                      {event.event_type === 'public' && (
                          userRole !== 'trainer' && (
                              <div>
                                {/* Disable the "Book" button if the maximum participants have been reached */}
                                {getUserBookingStatus(event.id) === "Book" && event.current_participants < event.max_participants && (
                                    <button
                                        className="button is-info mt-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssignToEvent(event);
                                        }}
                                    >
                                      Book
                                    </button>
                                )}

                                {/* Show "Pending" button when the booking is in progress */}
                                {getUserBookingStatus(event.id) === "Pending" && (
                                    <button className="button is-warning mt-2" disabled>
                                      Pending
                                    </button>
                                )}

                                {/* Show "Accepted" button if the user has already booked */}
                                {getUserBookingStatus(event.id) === "Accepted" && (
                                    <div>
                                      <strong><p>Accepted</p></strong>
                                      <button
                                          className="button is-danger mt-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const booking = bookings.find(booking => booking.event_id === event.id && booking.user_id === userId);
                                            handleCancelBooking(booking.id)
                                                .then((response) => {
                                                  console.log("Booking cancelled successfully", response);
                                                })
                                                .catch((error) => {
                                                  console.error("Error cancelling booking", error);
                                                });
                                          }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                )}
                              </div>
                          )
                      )}
                    </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip and Modal */}
      {tooltip.visible && (
          <div className="tooltip" style={{left: tooltip.position.x, top: tooltip.position.y}}>
            <h4>{tooltip.event.name}</h4>
            <p>{tooltip.event.description}</p>
            <p>{`Date: ${tooltip.event.date}`}</p>
            <p>{`Time: ${format(parse(tooltip.event.time, 'HH:mm:ss', new Date()), 'HH:mm')}`}</p> {/* Format time as HH:mm */}
            <p>{`Duration: ${tooltip.event.duration} min`}</p>
            {tooltip.event.event_type === 'public' && (
              <div className="participants">
                <span>{tooltip.event.current_participants} / {tooltip.event.max_participants}</span>
              </div>
            )}
            <p><strong>{tooltip.event.event_type.charAt(0).toUpperCase() + tooltip.event.event_type.slice(1).toLowerCase()} event</strong></p>
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
