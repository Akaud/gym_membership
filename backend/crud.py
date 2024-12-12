
from datetime import timedelta, time
from typing import Any, List, Type, Optional

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload
import models
import schemas
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# User Management
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(username=user.username,
                          email=user.email,
                          hashed_password=hashed_password,
                          name=user.name,
                          surname=user.surname,
                          role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, username: str):
    db_user = db.query(models.User).filter(models.User.username == username).first()
    return db_user


def get_user_id(db: Session, username: str) -> Any | None:
    db_user = db.query(models.User).filter(models.User.username == username).first()
    if db_user:
        return db_user.id
    return None


def update_user(db: Session, user_id: int, user_update: schemas.UserCreate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not db_user:
        return None

    db_user.username = user_update.username
    db_user.email = user_update.email
    db_user.hashed_password = pwd_context.hash(user_update.password)
    db_user.name = user_update.name
    db_user.surname = user_update.surname
    db_user.role = user_update.role

    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not db_user:
        return None

    db.delete(db_user)
    db.commit()
    return True


def create_event(db: Session, event: schemas.EventCreate, user_id: int):
    db_event = models.Event(
        name=event.name,
        description=event.description,
        date=event.date,
        time=event.time,
        duration=event.duration,
        event_type=event.event_type,
        is_personal_training=event.is_personal_training,
        max_participants=event.max_participants,
        room_number=event.room_number,
        creator_id=user_id,  # 'creator_id' field to link to the user who created the event
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def get_event(db: Session, event_id: int, user_id: int):
    # Fetch the user based on their ID
    user = db.query(models.User).filter(models.User.id == user_id).first()

    # Admins can view any event
    if user.role == "admin":
        return db.query(models.Event).filter(models.Event.id == event_id).first()

    # Trainers can see events they created (public or private)
    elif user.role == "trainer":
        return db.query(models.Event).filter(models.Event.id == event_id, models.Event.creator_id == user_id).first()

    # Members can see their own private events and all public events
    else:  # For gym members
        return db.query(models.Event).filter(
            (models.Event.id == event_id) &
            ((models.Event.creator_id == user_id) |  # Their own events
             (models.Event.event_type == "public"))  # All public events
        ).first()


def get_events(db: Session, user_id: int) -> list[models.Event]:
    # Fetch the user based on their ID
    user = db.query(models.User).filter(models.User.id == user_id).first()

    # Admins can view all events
    if user.role == "admin":
        return db.query(models.Event).all()

    # Trainers can see events they created (public or private)
    elif user.role == "trainer":
        return db.query(models.Event).filter(models.Event.creator_id == user_id).all()

    # Members can see their own private events and all public events
    else:  # For gym members
        return db.query(models.Event).filter(
            (models.Event.creator_id == user_id) |  # Their own events
            (models.Event.event_type == "public")  # All public events
        ).all()


def update_event(db: Session, event_id: int, event_update: schemas.EventCreate, user_id: int):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()

    if not db_event or (
            db_event.creator_id != user_id and db_event.trainer_id != user_id and not db.query(models.User).filter(
            models.User.id == user_id, models.User.role == "admin").first()):
        return None

    db_event.name = event_update.name
    db_event.description = event_update.description
    db_event.date = event_update.date
    db_event.time = event_update.time
    db_event.duration = event_update.duration
    db_event.event_type = event_update.event_type
    db_event.max_participants = event_update.max_participants
    db_event.room_number = event_update.room_number

    db.commit()
    db.refresh(db_event)
    return db_event


def delete_event(db: Session, event_id: int, user_id: int):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()

    if not db_event or (db_event.creator_id != user_id and
                        db_event.trainer_id != user_id and
                        not db.query(models.User).filter
                            (models.User.id == user_id, models.User.role == "admin").first()):
        return None

    db.delete(db_event)
    db.commit()
    return True


# Booking Management
def book_event(db: Session, event_id: int, user_id: int):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.max_participants and len(event.bookings) >= event.max_participants:
        raise HTTPException(status_code=400, detail="Event is fully booked")

    # Create booking
    db_booking = models.Booking(user_id=user_id, event_id=event_id)
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)

    return db_booking


def cancel_booking(db: Session, booking_id: int, user_id: int):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id,
                                              models.Booking.user_id == user_id).first()

    if not booking:
        return None

    db.delete(booking)
    db.commit()
    return True


def get_users(db: Session):
    users = db.query(models.User).all()
    if not users:
        return []
    return users


# Create a new membership plan
def create_membership_plan(db: Session, plan: schemas.MembershipPlanCreate):
    db_plan = models.MembershipPlan(
        name=plan.name,
        description=plan.description,
        price=plan.price,
        duration=plan.duration,
        promotion=plan.promotion
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan


# Get all membership plans
def get_membership_plans(db: Session):
    return db.query(models.MembershipPlan).all()


# Get a specific membership plan by ID
def get_membership_plan(db: Session, plan_id: int):
    return db.query(models.MembershipPlan).filter(models.MembershipPlan.id == plan_id).first()


# Update a membership plan
def update_membership_plan(db: Session, plan_id: int, plan_update: schemas.MembershipPlanCreate):
    db_plan = db.query(models.MembershipPlan).filter(models.MembershipPlan.id == plan_id).first()
    if db_plan:
        db_plan.name = plan_update.name
        db_plan.description = plan_update.description
        db_plan.price = plan_update.price
        db_plan.duration = plan_update.duration
        db_plan.promotion = plan_update.promotion
        db.commit()
        db.refresh(db_plan)
    return db_plan


# Delete a membership plan
def delete_membership_plan(db: Session, plan_id: int):
    db_plan = db.query(models.MembershipPlan).filter(models.MembershipPlan.id == plan_id).first()
    if db_plan:
        db.delete(db_plan)
        db.commit()
    return db_plan


# Create a new subscription
from datetime import timedelta
import calendar


def create_subscription(db: Session, subscription: schemas.SubscriptionCreate):
    try:
        # Fetch the membership plan
        membership_plan = db.query(models.MembershipPlan).filter(
            models.MembershipPlan.id == subscription.membership_plan_id).first()

        if not membership_plan:
            raise HTTPException(status_code=404, detail="Membership plan not found")

    except SQLAlchemyError as e:
        # Handle any database-related errors
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    try:
        # Calculate end_date based on the plan's duration more accurately
        start_date = subscription.start_date
        duration_months = membership_plan.duration

        # Use calendar.monthrange to get the last day of the month
        end_date = start_date.replace(day=1) + timedelta(
            days=calendar.monthrange(start_date.year, (start_date.month + duration_months - 1) % 12)[1]
        )

    except ValueError as e:
        # Handle any errors in date calculations
        raise HTTPException(status_code=400, detail=f"Invalid date or duration: {str(e)}")

    try:
        # Create the subscription
        db_subscription = models.Subscription(
            start_date=start_date,
            end_date=end_date,
            status="active",  # Automatically set status to "active"
            membership_plan_id=subscription.membership_plan_id,
            user_id=subscription.user_id
        )

        # Add the subscription to the database and commit
        db.add(db_subscription)
        db.commit()
        db.refresh(db_subscription)

    except SQLAlchemyError as e:
        # Roll back if there's a problem during commit
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error while creating subscription: {str(e)}")

    return db_subscription


# Get subscription for a user
def get_subscriptions_for_user(db: Session, user_id: int):
    return db.query(models.Subscription).filter(models.Subscription.user_id == user_id).all()


# Update a subscription (e.g., for renewals)
def update_subscription(db: Session, subscription_id: int, subscription_update: schemas.SubscriptionCreate):
    db_subscription = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()

    if not db_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # Update the fields
    db_subscription.start_date = subscription_update.start_date
    db_subscription.end_date = subscription_update.end_date
    db_subscription.status = subscription_update.status

    db.commit()
    db.refresh(db_subscription)
    return db_subscription
# Delete a subscription (cancel membership)
def delete_subscription(db: Session, subscription_id: int):
    db_subscription = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()

    if not db_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    db.delete(db_subscription)
    db.commit()
    return db_subscription

def get_subscription_by_id(db: Session, subscription_id: int):
    return db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()


# Exercises
def get_exercises(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.Exercise).offset(skip).limit(limit).all()

def create_exercise(db: Session, exercise: schemas.ExerciseCreate):
    exercise = models.Exercise(
        name=exercise.name,
        description=exercise.description,

    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise

def get_exercise(db: Session, exercise_id: int):
    return db.query(models.Exercise).filter(models.Exercise.id == exercise_id).first()


def update_exercise(db: Session, exercise_id: int, name: str = None, description: str = None):
    exercise = db.query(models.Exercise).filter(models.Exercise.id == exercise_id).first()
    if exercise:
        if name is not None:
            exercise.name = name
        if description is not None:
            exercise.description = description

        db.commit()
        db.refresh(exercise)
    return exercise


def delete_exercise(db: Session, exercise_id: int):
    exercise = db.query(models.Exercise).filter(models.Exercise.id == exercise_id).first()
    if exercise:
        db.delete(exercise)
        db.commit()
    return exercise

# Workout plans
def create_workout_plan(db: Session, workoutplan: schemas.WorkoutPlanCreate, user_id: int):
    workoutplan = models.Workout_Plan(
        name=workoutplan.name,
        user_id=user_id
    )
    db.add(workoutplan)
    db.commit()
    db.refresh(workoutplan)
    return workoutplan


def get_workout_plan(db: Session, workout_plan_id: int):
    return db.query(models.Workout_Plan).filter(models.Workout_Plan.id == workout_plan_id).first()


def get_workout_plans(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Workout_Plan)
        .filter(models.Workout_Plan.user_id == user_id)
        .options(joinedload(models.Workout_Plan.exercises).joinedload(models.Workout_Plan_Exercise.exercise))
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_workout_plan(db: Session, workout_plan_id: int, name: str):
    workout_plan = db.query(models.Workout_Plan).filter(models.Workout_Plan.id == workout_plan_id).first()
    if workout_plan:
        if name is not None:
            workout_plan.name = name

        db.commit()
        db.refresh(workout_plan)
    return workout_plan


def delete_workout_plan(db: Session, workout_plan_id: int):
    workout_plan = db.query(models.Workout_Plan).filter(models.Workout_Plan.id == workout_plan_id).first()
    if workout_plan:
        db.delete(workout_plan)
        db.commit()
    return workout_plan


# Workout Plan Exercise associations

def add_exercise_to_workout_plan(
    db: Session,
    workout_plan_id: int,
    exercise_id: int,
):
    association = models.Workout_Plan_Exercise(
        workout_plan_id=workout_plan_id,
        exercise_id=exercise_id,

    )
    db.add(association)
    db.commit()
    db.refresh(association)
    return association


def remove_exercise_from_workout_plan(db: Session, workout_plan_id: int, exercise_id: int):
    association = db.query(models.Workout_Plan_Exercise).filter(
        models.Workout_Plan_Exercise.workout_plan_id == workout_plan_id,
        models.Workout_Plan_Exercise.exercise_id == exercise_id
    ).first()

    if association:
        db.delete(association)
        db.commit()
    return association

def create_workout_log(db: Session, workout_log: models.WorkoutLog):
    db.add(workout_log)
    db.commit()
    db.refresh(workout_log)
    return workout_log