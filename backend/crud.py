from typing import Any, Optional, List

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload
import models
import schemas
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)

    user_data = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_password,
        "name": user.name,
        "surname": user.surname,
        "age": user.age,
        "gender": user.gender,
        "phone": user.phone,
        "role": user.role,
    }

    if user.role == "member":
        member_data = {
            "weight": user.weight,
            "height": user.height,
            "membership_status": user.membership_status,
        }
        db_user = models.Member(**user_data, **member_data)
    elif user.role == "trainer":
        trainer_data = {
            "description": user.description,
            "experience": user.experience,
            "specialization": user.specialization,
            "rating": user.rating,
            "RPH": user.RPH,
            "certification": user.certification,
            "photo": user.photo,
        }
        db_user = models.Trainer(**user_data, **trainer_data)
    elif user.role == "admin":
        db_user = models.Admin(**user_data)
    else:
        raise ValueError("Invalid role specified")

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return schemas.UserResponse.model_validate(db_user)

def get_user(db: Session, username: str):
    # Retrieve the user from the database
    db_user = db.query(models.User).filter(models.User.username == username).first()

    # If user is not found, return None
    if not db_user:
        return None

    # Create the common user data (which will be in all roles)
    user_data = {
        "id": db_user.id,
        "username": db_user.username,
        "hashed_password": db_user.hashed_password,
        "name": db_user.name,
        "surname": db_user.surname,
        "age": db_user.age,
        "gender": db_user.gender,
        "email": db_user.email,
        "phone": db_user.phone,
        "role": db_user.role,
    }

    # Initialize the role-specific details
    member_details = None
    trainer_details = None

    if db_user.role == "member":
        # Fetch member-specific details
        member_data = db.query(models.Member).filter(models.Member.username == username).first()
        member_details = schemas.Member(
            weight=member_data.weight,
            height=member_data.height,
            membership_status=member_data.membership_status,
        )

    elif db_user.role == "trainer":
        # Fetch trainer-specific details
        trainer_data = db.query(models.Trainer).filter(models.Trainer.username == username).first()
        trainer_details = schemas.Trainer(
            description=trainer_data.description,
            experience=trainer_data.experience,
            specialization=trainer_data.specialization,
            rating=trainer_data.rating,
            RPH=trainer_data.RPH,
            certification=trainer_data.certification,
            photo=trainer_data.photo,
        )


    # Construct the response, adding role-specific details as appropriate
    return schemas.UserResponse(
        **user_data,
        member_details=member_details,
        trainer_details=trainer_details,
    )

def get_user_by_id(db: Session, userid: int):
    # Retrieve the user from the database
    db_user = db.query(models.User).filter(models.User.id == userid).first()

    # If user is not found, return None
    if not db_user:
        return None

    # Create the common user data (which will be in all roles)
    user_data = {
        "id": db_user.id,
        "username": db_user.username,
        "hashed_password": db_user.hashed_password,
        "name": db_user.name,
        "surname": db_user.surname,
        "age": db_user.age,
        "gender": db_user.gender,
        "email": db_user.email,
        "phone": db_user.phone,
        "role": db_user.role,
    }

    # Initialize the role-specific details
    member_details = None
    trainer_details = None

    if db_user.role == "member":
        # Fetch member-specific details
        member_data = db.query(models.Member).filter(models.Member.id == userid).first()
        member_details = schemas.Member(
            weight=member_data.weight,
            height=member_data.height,
            membership_status=member_data.membership_status,
        )

    elif db_user.role == "trainer":
        # Fetch trainer-specific details
        trainer_data = db.query(models.Trainer).filter(models.Trainer.id == userid).first()
        trainer_details = schemas.Trainer(
            description=trainer_data.description,
            experience=trainer_data.experience,
            specialization=trainer_data.specialization,
            rating=trainer_data.rating,
            RPH=trainer_data.RPH,
            certification=trainer_data.certification,
            photo=trainer_data.photo,
        )


    # Construct the response, adding role-specific details as appropriate
    return schemas.UserResponse(
        **user_data,
        member_details=member_details,
        trainer_details=trainer_details,
    )

def get_user_id(db: Session, username: str) -> Any | None:
    db_user = db.query(models.User).filter(models.User.username == username).first()
    if db_user:
        return db_user.id
    return None


def update_user(db: Session, user_id: int, user_update: schemas.UserCreate):
    # Fetch the user from the database
    db_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not db_user:
        return None  # User not found

    # Update common user fields
    db_user.username = user_update.username
    db_user.email = user_update.email
    db_user.hashed_password = pwd_context.hash(user_update.password)
    db_user.name = user_update.name
    db_user.surname = user_update.surname
    db_user.age = user_update.age
    db_user.gender = user_update.gender
    db_user.phone = user_update.phone
    db_user.role = user_update.role

    # Handle role-specific updates
    if user_update.role == "member":
        if isinstance(db_user, models.Member):
            db_user.weight = user_update.weight
            db_user.height = user_update.height
            db_user.membership_status = user_update.membership_status
        else:
            raise ValueError("The user is not a member")
    elif user_update.role == "trainer":
        if isinstance(db_user, models.Trainer):
            db_user.description = user_update.description
            db_user.experience = user_update.experience
            db_user.specialization = user_update.specialization
            db_user.rating = user_update.rating
            db_user.RPH = user_update.RPH
            db_user.certification = user_update.certification
            db_user.photo = user_update.photo
        else:
            raise ValueError("The user is not a trainer")
    elif user_update.role == "admin":
        if not isinstance(db_user, models.Admin):
            raise ValueError("The user is not an admin")

    # Commit changes to the database
    db.commit()
    db.refresh(db_user)

    # Return the updated user
    return schemas.UserResponse.model_validate(db_user)


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


def get_events(db: Session, user_id: int) -> List[schemas.Event]:
    # Fetch the user based on their ID
    user = db.query(models.User).filter(models.User.id == user_id).first()

    # Admins can view all events
    if user.role == "admin":
        events = db.query(models.Event).all()

    # Trainers can see events they created (public or private)
    elif user.role == "trainer":
        events = db.query(models.Event).filter(models.Event.creator_id == user_id).all()

    # Members can see their own private events and all public events
    else:  # For gym members
        events = db.query(models.Event).filter(
            (models.Event.creator_id == user_id) |  # Their own events
            (models.Event.event_type == "public")  # All public events
        ).all()

    # Prepare a list of events with current participant count
    event_data = []
    for event in events:
        # Count the bookings where the status is True
        current_participants = len([booking for booking in event.bookings if booking.status])

        event_info = schemas.Event(
            id=event.id,
            name=event.name,
            description=event.description,
            date=event.date,
            time=event.time,
            duration=event.duration,
            event_type=event.event_type,
            is_personal_training=event.is_personal_training,
            max_participants=event.max_participants,
            room_number=event.room_number,
            creator_id=event.creator_id,
            current_participants=current_participants  # Count the bookings where status is True
        )
        event_data.append(event_info)

    return event_data


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
    """
    Books an event for a user, ensuring all constraints are met.
    """
    event = db.query(models.Event).filter(models.Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.max_participants is not None:
        participant_count = db.query(models.Booking).filter(models.Booking.event_id == event_id).count()
        if participant_count >= event.max_participants:
            raise HTTPException(status_code=400, detail="Event is fully booked")

    existing_booking = db.query(models.Booking).filter(
        models.Booking.event_id == event_id,
        models.Booking.user_id == user_id
    ).first()
    if existing_booking:
        raise HTTPException(status_code=400, detail="User has already booked this event")

    db_booking = models.Booking(user_id=user_id, event_id=event_id, trainer_id=event.creator_id, status=False)
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)

    return db_booking

def update_booking_status(db: Session, booking_id: int):
    """
    Updates the status of a booking to confirm or unconfirm it.
    """
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = True
    db.commit()
    db.refresh(booking)

    return booking


def cancel_booking(db: Session, booking_id: int):
    """
    Cancels a booking made by a user.
    """
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        return None
    db.delete(booking)
    db.commit()
    return True


def get_all_bookings(db: Session, event_id: int = None, user_id: int = None):
    """
    Returns all bookings, optionally filtering by event_id, user_id, or trainer_id.
    This function also includes related Event, User, and Trainer objects.
    """
    query = db.query(models.Booking).join(models.Event).join(models.User).join(models.Trainer)

    if event_id:
        query = query.filter(models.Booking.event_id == event_id)

    if user_id:
        query = query.filter(models.Booking.user_id == user_id)


    bookings = query.all()

    return bookings

def get_users(db: Session):
    # Query all users from the database
    users = db.query(models.User).all()

    if not users:
        return []  # Return an empty list if no users are found

    # Convert users to schema responses
    user_responses = []
    for user in users:
        if isinstance(user, models.Member):
            user_response = schemas.UserResponse.model_validate(
                {
                    "id": user.id,
                    "username": user.username,
                    "name": user.name,
                    "surname": user.surname,
                    "age": user.age,
                    "gender": user.gender,
                    "email": user.email,
                    "phone": user.phone,
                    "role": user.role,
                    "member_details": {
                        "weight": user.weight,
                        "height": user.height,
                        "membership_status": user.membership_status,
                    },
                }
            )
        elif isinstance(user, models.Trainer):
            user_response = schemas.UserResponse.model_validate(
                {
                    "id": user.id,
                    "username": user.username,
                    "name": user.name,
                    "surname": user.surname,
                    "age": user.age,
                    "gender": user.gender,
                    "email": user.email,
                    "phone": user.phone,
                    "role": user.role,
                    "trainer_details": {
                        "description": user.description,
                        "experience": user.experience,
                        "specialization": user.specialization,
                        "rating": user.rating,
                        "RPH": user.RPH,
                        "certification": user.certification,
                        "photo": user.photo,
                    },
                }
            )
        elif isinstance(user, models.Admin):
            user_response = schemas.UserResponse.model_validate(
                {
                    "id": user.id,
                    "username": user.username,
                    "name": user.name,
                    "surname": user.surname,
                    "age": user.age,
                    "gender": user.gender,
                    "email": user.email,
                    "phone": user.phone,
                    "role": user.role,
                }
            )
        else:
            raise ValueError(f"Unknown user role for user ID {user.id}")

        user_responses.append(user_response)

    return user_responses



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

# CRUD function for creating the subscription
def create_subscription(db: Session, subscription: schemas.SubscriptionCreate):
    try:
        # Fetch the membership plan
        membership_plan = db.query(models.MembershipPlan).filter(
            models.MembershipPlan.id == subscription.membership_plan_id).first()

        if not membership_plan:
            raise HTTPException(status_code=404, detail="Membership plan not found")

        # Get start_date and duration from the subscription
        start_date = subscription.start_date
        duration_months = membership_plan.duration

        # Calculate the end_date based on start_date and duration
        new_month = start_date.month + duration_months - 1  # Add the duration months
        new_year = start_date.year + (new_month // 12)  # Adjust for year overflow
        new_month = new_month % 12 + 1  # Ensure the month is in range 1-12

        # Set the new year and month to the end date
        # We set the day to the last valid day of the month after the adjustment
        _, last_day = calendar.monthrange(new_year, new_month)  # Get last day of the month
        end_date = start_date.replace(year=new_year, month=new_month, day=1) + timedelta(days=last_day - 1)

        # Create the subscription record
        db_subscription = models.Subscription(
            start_date=start_date,
            end_date=end_date,
            status="active",  # Automatically set status to "active"
            membership_plan_id=subscription.membership_plan_id,
            user_id=subscription.user_id
        )

        # Add to the database and commit
        db.add(db_subscription)
        db.commit()
        db.refresh(db_subscription)

        return db_subscription

    except SQLAlchemyError as e:
        db.rollback()  # Rollback in case of error
        raise HTTPException(status_code=500, detail=f"Database error while creating subscription: {str(e)}")
    except ValueError as e:
        # Handle invalid date values
        raise HTTPException(status_code=400, detail=f"Invalid date or duration: {str(e)}")

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
        duration=exercise.duration,
        sets=exercise.sets,
        reps=exercise.reps,
        muscles=exercise.muscles
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise

def get_exercise(db: Session, exercise_id: int):
    return db.query(models.Exercise).filter(models.Exercise.id == exercise_id).first()


def update_exercise(db: Session, exercise_id: int, name: str = None, description: str = None, duration: int = None,
                    sets: int = None, reps: int = None, muscles: str = None):
    exercise = db.query(models.Exercise).filter(models.Exercise.id == exercise_id).first()
    if exercise:
        if name is not None:
            exercise.name = name
        if description is not None:
            exercise.description = description
        if duration is not None:
            exercise.duration = duration
        if sets is not None:
            exercise.sets = sets
        if reps is not None:
            exercise.reps = reps
        if muscles is not None:
            exercise.muscles = muscles

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
        start_time=workoutplan.start_time,
        end_time=workoutplan.end_time,
        duration=workoutplan.duration,
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


def update_workout_plan(db: Session, workout_plan_id: int, name: str = None, start_time: str = None,
                        end_time: str = None, duration: int = None):
    workout_plan = db.query(models.Workout_Plan).filter(models.Workout_Plan.id == workout_plan_id).first()
    if workout_plan:
        if name is not None:
            workout_plan.name = name
        if start_time is not None:
            workout_plan.start_time = start_time
        if end_time is not None:
            workout_plan.end_time = end_time
        if duration is not None:
            workout_plan.duration = duration

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
    repetitions: Optional[int] = None,
    duration: Optional[int] = None,
    sets: Optional[int] = None
):
    association = models.Workout_Plan_Exercise(
        workout_plan_id=workout_plan_id,
        exercise_id=exercise_id,
        repetitions=repetitions,  # Can be None
        duration=duration,        # Can be None
        sets=sets                 # Can be None
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

