from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Date,Time
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    surname = Column(String)
    role = Column(String)  # 'member', 'trainer', 'admin'

    # Events created by the user (trainers and admins)
    created_events = relationship("Event", back_populates="creator")

    # Events booked by the user (members)
    booked_events = relationship("Booking", back_populates="user")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    date = Column(Date)
    time = Column(Time)
    duration = Column(Integer)
    event_type = Column(String)
    is_personal_training = Column(Boolean, default=False)  # True for personal training sessions

    max_participants = Column(Integer, nullable=True)  # For group events only
    room_number = Column(String, nullable=True)  # For group events only

    # User who created the event (trainer or admin)
    creator_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User", back_populates="created_events")

    # Participants (for public group events)
    bookings = relationship("Booking", back_populates="event")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # User who booked the event
    event_id = Column(Integer, ForeignKey("events.id"))  # Booked event

    # Relationships
    user = relationship("User", back_populates="booked_events")
    event = relationship("Event", back_populates="bookings")
