from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from datetime import date, time


class UserCreate(BaseModel):
    username: str
    name: str
    surname: str
    age: int
    gender: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: str

    # Member-specific fields
    weight: Optional[float] = None
    height: Optional[int] = None
    membership_status: Optional[str] = None

    # Trainer-specific fields
    description: Optional[str] = None
    experience: Optional[int] = None
    specialization: Optional[str] = None
    rating: Optional[int] = None
    RPH: Optional[int] = None  # Rate Per Hour
    certification: Optional[str] = None
    photo: Optional[str] = None

class Member(BaseModel):
    weight: Optional[float]
    height: Optional[int]
    membership_status: Optional[str]

class Trainer(BaseModel):
    description: Optional[str]
    experience: Optional[int]
    specialization: Optional[str]
    rating: Optional[int]
    RPH: Optional[int]  # Rate Per Hour
    certification: Optional[str]
    photo: Optional[str]


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    surname: str
    age: int
    gender: str
    email: EmailStr
    phone: Optional[str]
    role: str
    member_details: Optional[Member] = None
    trainer_details: Optional[Trainer] = None

    class Config:
        from_attributes = True


# Event creation model
class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    date: date
    time: time  # Date and time of the event
    duration: int  # Duration in minutes
    event_type: str  # 'private' or 'public'
    is_personal_training: Optional[bool] = False  # True if personal training
    max_participants: Optional[int] = None  # For group classes
    room_number: Optional[str] = None  # For group classes
    trainer_id: Optional[int] = None  # Trainer assigned for personal training (public only)

    @field_validator('duration')
    def duration_must_be_greater_than_15(cls, value):
        if value <= 15:
            raise ValueError('Duration must be greater than 15 minutes')
        return value

    @field_validator('max_participants')
    def max_participants_must_be_greater_than_0(cls, value):
        if value <= 0:
            raise ValueError('Max participants value must be greater than 0')
        return value

    class Config:
        from_attributes = True


# Event response model
class Event(BaseModel):
    id: int
    name: str
    description: Optional[str]
    date: date
    time: time  # Date and time of the event
    duration: int
    event_type: str  # 'private' or 'public'
    is_personal_training: bool  # True if personal training
    max_participants: Optional[int] = None  # For group classes
    room_number: Optional[str] = None  # For group classes
    creator_id: int  # User ID who created the event
    trainer_id: Optional[int] = None  # Trainer assigned for personal training
    participants: List[UserResponse] = []  # List of participants (for public group events)

    class Config:
        from_attributes = True


# Booking creation model
class BookingCreate(BaseModel):
    event_id: int


# Booking response model
class Booking(BaseModel):
    id: int
    user_id: int
    event_id: int
    user: UserResponse  # Include details about the user booking the event
    event: Event  # Include details about the event being booked

    class Config:
        from_attributes = True


# Membership Plan Schema
class MembershipPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration: int  # in months


class MembershipPlanCreate(MembershipPlanBase):
    promotion: Optional[str] = None


class MembershipPlan(MembershipPlanBase):
    id: int
    promotion: Optional[str] = None

    class Config:
        from_attributes = True


# Subscription Schema
class SubscriptionBase(BaseModel):
    start_date: date
    end_date: date
    status: str


class SubscriptionCreate(SubscriptionBase):
    membership_plan_id: int
    user_id: int


class Subscription(SubscriptionBase):
    id: int
    membership_plan: MembershipPlan

    class Config:
        from_attributes = True


# Base schema for Exercise
class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration: Optional[int] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    muscles: Optional[str] = None

class ExerciseCreate(ExerciseBase):
    pass

class Exercise(ExerciseBase):
    id: int

    class Config:
        from_attributes = True

# Association schema between Workout Plan and Exercise
class WorkoutPlanExerciseBase(BaseModel):
    workout_plan_id: int
    exercise_id: int
    repetitions: Optional[int] = None
    sets: Optional[int] = None

class WorkoutPlanExerciseCreate(WorkoutPlanExerciseBase):
    pass

class WorkoutPlanExercise(WorkoutPlanExerciseBase):
    exercise: Exercise  # Nested exercise details for each association

    class Config:
        from_attributes = True

# Base schema for Workout Plan
class WorkoutPlanBase(BaseModel):
    name: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration: Optional[int] = None

class WorkoutPlanCreate(WorkoutPlanBase):
    pass

# Detailed WorkoutPlan schema including related exercises through WorkoutPlanExercise
class WorkoutPlan(WorkoutPlanBase):
    id: int
    exercises: List[WorkoutPlanExercise] = []  # Now correctly referencing WorkoutPlanExercise objects

    class Config:
        from_attributes = True