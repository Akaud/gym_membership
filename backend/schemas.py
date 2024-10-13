from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from datetime import date, time


# User creation model (used for creating a user, includes password)
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: str
    surname: str
    role: str  # 'member', 'trainer', or 'admin'


# User response model (used for reading user data, excludes password)
class User(BaseModel):
    id: int
    username: str
    email: EmailStr
    name: str
    surname: str
    role: str

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
    participants: List[User] = []  # List of participants (for public group events)

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
    user: User  # Include details about the user booking the event
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
