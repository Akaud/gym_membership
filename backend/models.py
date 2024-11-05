from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Date, Time, Float
from sqlalchemy.orm import relationship
from database import Base
from datetime import date


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

    # Relationship to Subscriptions
    subscriptions = relationship("Subscription", back_populates="user")

    workout_plans = relationship("Workout_Plan", back_populates="user")


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


# MembershipPlan model (as before)
class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    price = Column(Float)
    description = Column(String, nullable=True)
    duration = Column(Integer)  # in months
    promotion = Column(String, nullable=True)

    subscriptions = relationship("Subscription", back_populates="membership_plan")


# Subscription model
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(Date, default=date.today)
    end_date = Column(Date)  # Calculated based on duration of the plan
    status = Column(String, default="active")  # Could be 'active', 'expired', 'canceled'

    # ForeignKey to link Subscription to MembershipPlan
    membership_plan_id = Column(Integer, ForeignKey("membership_plans.id"))
    membership_plan = relationship("MembershipPlan", back_populates="subscriptions")

    # ForeignKey to link Subscription to User
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="subscriptions")


class Exercise(Base):
    __tablename__ = "exercises"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)
    sets = Column(Integer, nullable=True)
    reps = Column(Integer, nullable=True)
    muscles = Column(String, nullable=True)
    workout_plans = relationship("Workout_Plan_Exercise", back_populates="exercise")


class Workout_Plan(Base):
    __tablename__ = "workout_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    duration = Column(Integer, nullable=True)

    exercises = relationship("Workout_Plan_Exercise", back_populates="workout_plan", cascade="all, delete-orphan")

    user_id = Column(Integer, ForeignKey('users.id'))
    user = relationship("User", back_populates="workout_plans")

class Workout_Plan_Exercise(Base):
    __tablename__ = "workout_plan_exercises"
    workout_plan_id = Column(Integer, ForeignKey('workout_plans.id'), primary_key=True)
    exercise_id = Column(Integer, ForeignKey('exercises.id'), primary_key=True)
    duration = Column(Integer, nullable=True)
    repetitions = Column(Integer, nullable=True)
    sets = Column(Integer, nullable=True)

    workout_plan = relationship("Workout_Plan", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="workout_plans")