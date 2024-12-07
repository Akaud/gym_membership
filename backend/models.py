from sqlalchemy import Column, Integer, String, CheckConstraint, ForeignKey, Boolean, Date, Time, Float, \
    UniqueConstraint
from sqlalchemy.orm import relationship, validates, Session
from database import Base
from datetime import date


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(50), nullable=False)
    surname = Column(String(50), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(100), unique=True, index=True, nullable=True)

    hashed_password = Column(String(255), nullable=False)
    role = Column(String(10), nullable=False)

    created_events = relationship("Event", back_populates="creator")
    booked_events = relationship("Booking", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    workout_plans = relationship("Workout_Plan", back_populates="user")

    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'trainer', 'member')", name="check_valid_roles"
        ),
        CheckConstraint(
            "gender IN ('male', 'female')", name="check_valid_genders"
        ),
    )

    @validates('age')
    def validate_age(self, key, value):
        """
        Validates that the age is between 0 and 120.
        """
        if not (0 <= value <= 120):
            raise ValueError("Age must be a positive integer between 0 and 120.")
        return value

    __mapper_args__ = {
        'polymorphic_identity': 'user',
        'polymorphic_on': role
    }


class Member(User):
    __tablename__ = "members"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    weight = Column(Float, nullable=True)
    height = Column(Integer, nullable=True)
    membership_status = Column(String(50), nullable=True)

    __mapper_args__ = {
        'polymorphic_identity': 'member',
    }


class Trainer(User):
    __tablename__ = "trainers"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    description = Column(String(255), nullable=True)
    experience = Column(Integer, nullable=True)
    specialization = Column(String(255), nullable=True)
    rating = Column(Integer, nullable=True)
    RPH = Column(Integer, nullable=True)
    certification = Column(String(255), nullable=True)
    photo = Column(String(255), nullable=True)

    # Establish the relationship with Booking
    bookings = relationship('Booking', back_populates='trainer', lazy='dynamic')

    __mapper_args__ = {
        'polymorphic_identity': 'trainer',
    }


class Admin(User):
    __tablename__ = "admins"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)

    __mapper_args__ = {
        'polymorphic_identity': 'admin',
    }


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    duration = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False)
    is_personal_training = Column(Boolean, default=False)

    max_participants = Column(Integer, nullable=True)
    room_number = Column(String, nullable=True)

    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="created_events")

    bookings = relationship("Booking", back_populates="event", cascade="all, delete-orphan")

    @property
    def current_participants(self):
        """
        Returns the number of current participants in the event.
        """
        return len(self.bookings)

    @validates('duration')
    def validate_duration(self, key, value):
        """
        Validates that the duration is between 0 and 99.
        """
        if not (0 <= value <= 99):
            raise ValueError("Duration must be a positive integer between 0 and 99.")
        return value


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Boolean, default=False, nullable=False)

    event = relationship("Event", back_populates="bookings")
    user = relationship("User", back_populates="booked_events")
    trainer = relationship("Trainer", back_populates="bookings", foreign_keys=[trainer_id])

    __table_args__ = (
        UniqueConstraint('user_id', 'event_id', name='unique_user_event_booking'),
    )


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
