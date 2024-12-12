import os
from fastapi import FastAPI, HTTPException, Depends, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone, time
from passlib.context import CryptContext
#from apscheduler.schedulers.background import BackgroundScheduler
from database import engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated, List, Optional

from dotenv import load_dotenv
load_dotenv()

import crud
import models
import schemas

app = FastAPI()


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


origins = [
    "http://localhost:3000",
    "https://quickchart.io"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

db_dependency = Annotated[Session, Depends(get_db)]


@app.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def register_user(user: schemas.UserCreate, db: db_dependency) -> schemas.User:
    db_user = crud.get_user(db=db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="User already exists")
    return crud.create_user(db=db, user=user)


def authenticate_user(username: str, password: str, db: db_dependency):
    user = crud.get_user(db=db, username=username)
    if not user:
        return False
    if not pwd_context.verify(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({'exp': expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},  # Include role
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=403, detail="Token is invalid")
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invalid")


@app.get("/verify-token/{token}")
async def verify_user_token(token: str, db: Session = Depends(get_db)):
    # Verify the token and return the user's role
    payload = verify_token(token=token)
    username = payload.get("sub")

    user = crud.get_user(db, username=username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Token is valid", "role": user.role, "user_id": user.id}


@app.get("/users", response_model=List[schemas.User])
async def list_users(db: db_dependency):
    users = crud.get_users(db=db)
    return users


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_username: str = payload.get("sub")
        if user_username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user_id = crud.get_user_id(db, user_username)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return {"user": user, "role": user.role}  # Return user and role


@app.get("/user/profile", response_model=schemas.User)  # Use the schemas.User reference here
async def get_user_profile(current_user: models.User = Depends(get_current_user)):
    return current_user["user"]


# Event Endpoints
@app.post("/event", response_model=schemas.Event, status_code=status.HTTP_201_CREATED)
async def create_event(event: schemas.EventCreate, db: db_dependency,
                       current_user: models.User = Depends(get_current_user)):
    return crud.create_event(db=db, event=event, user_id=current_user['user'].id)


@app.get("/events", response_model=List[schemas.Event])
async def list_events(db: db_dependency, current_user: models.User = Depends(get_current_user)):
    return crud.get_events(db=db, user_id=current_user['user'].id)


@app.put("/event/{event_id}", response_model=schemas.Event)
async def update_event(event_id: int, event: schemas.EventCreate, db: db_dependency,
                       current_user: models.User = Depends(get_current_user)):
    updated_event = crud.update_event(db, event_id, event, current_user['user'].id)
    if updated_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return updated_event


@app.delete("/event/{event_id}", response_model=dict)
async def delete_event(event_id: int, db: db_dependency, current_user: models.User = Depends(get_current_user)):
    result = crud.delete_event(db, event_id, current_user['user'].id)
    if not result:
        raise HTTPException(status_code=404, detail="Event not found or permission denied")
    return {"message": "Event deleted successfully"}


# Booking Endpoints
@app.post("/events/{event_id}/book", response_model=schemas.Booking, status_code=status.HTTP_201_CREATED)
async def book_event(event_id: int, db: db_dependency, current_user: models.User = Depends(get_current_user)):
    return crud.book_event(db=db, event_id=event_id, user_id=current_user['user'].id)


@app.delete("/bookings/{booking_id}", response_model=dict)
async def cancel_booking(booking_id: int, db: db_dependency, current_user: models.User = Depends(get_current_user)):
    result = crud.cancel_booking(db, booking_id, current_user['user'].id)
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking cancelled successfully"}


# Update a user
@app.put("/user/{user_id}", response_model=schemas.User)
async def update_user(user_id: int, user: schemas.UserCreate, db: db_dependency):
    db_user = crud.update_user(db, user_id, user)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# Delete a user
@app.delete("/user/{user_id}", response_model=dict)
async def delete_user(user_id: int, db: db_dependency):
    result = crud.delete_user(db, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


# ----------------MEMBERSHIP PLAN SUBSCRIBTION----------------------------------


# Create a new membership plan
@app.post("/membership-plans/", response_model=schemas.MembershipPlan)
def create_membership_plan(plan: schemas.MembershipPlanCreate, db: Session = Depends(get_db)):
    return crud.create_membership_plan(db=db, plan=plan)


# Get all membership plans
@app.get("/membership-plans/", response_model=list[schemas.MembershipPlan])
def get_membership_plans(db: Session = Depends(get_db)):
    return crud.get_membership_plans(db)


# Get a specific membership plan by ID
@app.get("/membership-plans/{plan_id}", response_model=schemas.MembershipPlan)
def get_membership_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = crud.get_membership_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Membership plan not found")
    return plan


# Update a membership plan
@app.put("/membership-plans/{plan_id}", response_model=schemas.MembershipPlan)
def update_membership_plan(plan_id: int, plan_update: schemas.MembershipPlanCreate, db: Session = Depends(get_db)):
    return crud.update_membership_plan(db, plan_id, plan_update)


# Delete a membership plan
@app.delete("/membership-plans/{plan_id}", response_model=schemas.MembershipPlan)
def delete_membership_plan(plan_id: int, db: Session = Depends(get_db)):
    return crud.delete_membership_plan(db, plan_id)


# Create a new subscription
@app.post("/subscriptions/", response_model=schemas.Subscription)
def create_subscription(
        subscription: schemas.SubscriptionCreate,
        db: Session = Depends(get_db)):
    try:
        # Call the CRUD function to create the subscription
        db_subscription = crud.create_subscription(db, subscription)
        return db_subscription
    except HTTPException as e:
        raise e

# Get subscriptions for a specific user
@app.get("/users/{user_id}/subscriptions")
def get_user_subscriptions(user_id: int, db: Session = Depends(get_db)):
    return crud.get_subscriptions_for_user(db, user_id)


# Update subscription
@app.put("/subscriptions/{subscription_id}", response_model=schemas.Subscription)
def update_subscription(subscription_id: int, subscription: schemas.SubscriptionCreate, db: Session = Depends(get_db)):
    return crud.update_subscription(db, subscription_id, subscription)


# Delete subscription (cancel membership)
@app.delete("/subscriptions/{subscription_id}", response_model=dict)
def delete_subscription(subscription_id: int, db: Session = Depends(get_db)):
    result = crud.delete_subscription(db, subscription_id)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription deleted successfully"}


# Get membership status by subscription ID
@app.get("/subscriptions/{subscription_id}/status")
def get_membership_status(subscription_id: int, db: Session = Depends(get_db)):
    subscription = crud.get_subscription_by_id(db, subscription_id)  # Fetch subscription details
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return {"status": subscription.status}  # Return the subscription status

#--------------------------------Workouts------------------------------------

@app.get("/workoutplans/", response_model=list[schemas.WorkoutPlan])
def read_workout_plans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    workout_plans = crud.get_workout_plans(db, user_id=current_user['user'].id, skip=skip, limit=limit)
    return workout_plans


@app.post("/workoutplans/", response_model=schemas.WorkoutPlan)
async def create_workout_plan(
    workoutplan: schemas.WorkoutPlanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_workoutplan = crud.create_workout_plan(db=db, workoutplan=workoutplan, user_id=current_user['user'].id)
    return db_workoutplan

@app.get("/workoutplans/{workout_plan_id}", response_model=schemas.WorkoutPlan)
def read_workout_plan(workout_plan_id: int, db: Session = Depends(get_db)):
    workout_plan = crud.get_workout_plan(db, workout_plan_id)
    if workout_plan is None:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return workout_plan

@app.put("/workoutplans/{workout_plan_id}", response_model=schemas.WorkoutPlan)
def update_workout_plan(workout_plan_id: int, name: str, db: Session = Depends(get_db)):
    workout_plan = crud.update_workout_plan(db, workout_plan_id, name)
    if workout_plan is None:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return workout_plan



@app.post("/workoutplans/{workout_plan_id}/exercises/{exercise_id}", response_model=schemas.WorkoutPlanExercise)
def add_exercise_to_workout_plan(
    workout_plan_id: int,
    exercise_id: int,
    db: Session = Depends(get_db)
):
    return crud.add_exercise_to_workout_plan(db, workout_plan_id, exercise_id)
# Delete a workout plan
@app.delete("/workoutplans/{workout_plan_id}", status_code=204)
def delete_workout_plan(workout_plan_id: int, db: Session = Depends(get_db)):
    workout_plan = db.query(models.Workout_Plan).filter(models.Workout_Plan.id == workout_plan_id).first()
    if not workout_plan:
        raise HTTPException(status_code=404, detail="Workout Plan not found")

    db.delete(workout_plan)
    db.commit()

    return {"message": "Workout plan deleted"}


@app.delete("/workoutplans/exercises/{workout_plan_exercise_id}", status_code=204)
def remove_exercise_from_workout_plan(workout_plan_exercise_id: int, db: Session = Depends(get_db)):
    association = (
        db.query(models.Workout_Plan_Exercise)
        .filter(models.Workout_Plan_Exercise.id == workout_plan_exercise_id)
        .first()
    )
    if not association:
        raise HTTPException(status_code=404, detail="Exercise not found in workout plan")

    db.delete(association)
    db.commit()
    return {"message": "Exercise removed from workout plan"}



#--------------------------------Exercises-----------------------------------



@app.get("/exercises/", response_model=list[schemas.Exercise])
async def read_exercises(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    exercises = crud.get_exercises(db, skip=skip, limit=limit)
    return exercises

@app.post("/exercises/", response_model=schemas.Exercise)
async def add_exercise(exercise: schemas.ExerciseCreate, db: Session = Depends(get_db)):
    return crud.create_exercise(db=db, exercise=exercise)

@app.put("/exercises/{exercise_id}", response_model=schemas.Exercise)
def update_exercise(exercise_id: int, name: str = None, description: str = None, db: Session = Depends(get_db)):
    exercise = crud.update_exercise(db, exercise_id, name, description)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise


@app.delete("/exercises/{exercise_id}", response_model=schemas.Exercise)
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    # remove all associations with workout plans
    associations = db.query(models.Workout_Plan_Exercise).filter(
        models.Workout_Plan_Exercise.exercise_id == exercise_id).all()

    for association in associations:
        db.delete(association)
    db.commit()

    # Now delete the exercise itself
    exercise = db.query(models.Exercise).filter(models.Exercise.id == exercise_id).first()
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")

    db.delete(exercise)
    db.commit()

    return exercise


#-----------------------LOG ------------------------


@app.post("/workout-logs/", response_model=schemas.WorkoutLogCreate)
def create_workout_log(
        workout_log: schemas.WorkoutLogCreate,
        db: Session = Depends(get_db)
):
    # Check if the workout_plan_exercise_id exists in the workout_plan_exercises table
    workout_plan_exercise = db.query(models.Workout_Plan_Exercise).filter(
        models.Workout_Plan_Exercise.id == workout_log.workout_plan_exercise_id
    ).first()

    if not workout_plan_exercise:
        raise HTTPException(status_code=404, detail="Workout plan exercise not found")

    # Create the WorkoutLog instance
    db_workout_log = models.WorkoutLog(
        workout_plan_exercise_id=workout_log.workout_plan_exercise_id,
        sets=workout_log.sets,
        reps_per_set=workout_log.reps_per_set,
        weight_used=workout_log.weight_used,
        duration=workout_log.duration,
        distance=workout_log.distance,
        date=workout_log.date
    )

    # Add the new log to the database
    return crud.create_workout_log(db=db, workout_log=db_workout_log)


@app.get("/workout/logs", response_model=list[schemas.WorkoutLogBase])
def get_user_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_id = current_user['user'].id

    # Query to get all workout logs for the user, including necessary fields
    workout_logs = db.query(
        models.WorkoutLog.workout_plan_exercise_id,  # Include the workout_plan_exercise_id
        models.WorkoutLog.date,
        models.WorkoutLog.sets,
        models.WorkoutLog.reps_per_set,
        models.WorkoutLog.weight_used,
        models.WorkoutLog.duration,
        models.WorkoutLog.distance
    ).join(
        models.Workout_Plan_Exercise, models.WorkoutLog.workout_plan_exercise_id == models.Workout_Plan_Exercise.id
    ).join(
        models.Workout_Plan, models.Workout_Plan_Exercise.workout_plan_id == models.Workout_Plan.id
    ).filter(
        models.Workout_Plan.user_id == user_id
    ).all()

    if not workout_logs:
        raise HTTPException(status_code=404, detail="No workout logs found for the user")

    # Returning the workout logs
    return workout_logs


@app.get("/user/logs/exercise-info", response_model=dict)
def get_exercise_info_from_logs(
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
):
    """
    Retrieve unique exercise names from user logs and their associated attributes.

    Returns:
        A dictionary where keys are exercise names and values are lists of available attributes.
    """
    user_id = current_user['user'].id

    # Query to get all workout logs for the user, joining necessary tables
    workout_logs = db.query(
        models.WorkoutLog,
        models.Exercise.name
    ).join(
        models.Workout_Plan_Exercise, models.WorkoutLog.workout_plan_exercise_id == models.Workout_Plan_Exercise.id
    ).join(
        models.Workout_Plan, models.Workout_Plan_Exercise.workout_plan_id == models.Workout_Plan.id
    ).join(
        models.Exercise, models.Workout_Plan_Exercise.exercise_id == models.Exercise.id
    ).filter(
        models.Workout_Plan.user_id == user_id
    ).all()

    if not workout_logs:
        raise HTTPException(status_code=404, detail="No workout logs found for the user")

    exercise_info = {}

    # Process logs to extract exercise names and their attributes
    for log, exercise_name in workout_logs:
        if exercise_name not in exercise_info:
            exercise_info[exercise_name] = set()

        # Determine available attributes for this log entry
        if log.sets is not None:
            exercise_info[exercise_name].add("sets")
        if log.reps_per_set is not None:
            exercise_info[exercise_name].add("reps_per_set")
        if log.weight_used is not None:
            exercise_info[exercise_name].add("weight_used")
        if log.duration is not None:
            exercise_info[exercise_name].add("duration")
        if log.distance is not None:
            exercise_info[exercise_name].add("distance")

    # Convert sets to lists for JSON serialization
    exercise_info = {key: list(value) for key, value in exercise_info.items()}

    return exercise_info


@app.get("/exercise/{exercise_name}/logs", response_model=list[schemas.WorkoutLogBase])
def get_exercise_logs_for_user(
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_id = current_user['user'].id
    # Query to get the exercise ID based on the name
    exercise = db.query(models.Exercise).filter(models.Exercise.name == exercise_name).first()

    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Query to get the workout plans associated with the user
    workout_plans = db.query(models.Workout_Plan).filter(models.Workout_Plan.user_id == user_id).all()

    if not workout_plans:
        raise HTTPException(status_code=404, detail="No workout plans found for the user")

    # Query to get workout logs for the exercise and user, joining the necessary tables
    workout_logs = db.query(models.WorkoutLog).join(
        models.Workout_Plan_Exercise, models.WorkoutLog.workout_plan_exercise_id == models.Workout_Plan_Exercise.id
    ).join(
        models.Workout_Plan, models.Workout_Plan_Exercise.workout_plan_id == models.Workout_Plan.id
    ).filter(
        models.Workout_Plan.user_id == user_id,
        models.Workout_Plan_Exercise.exercise_id == exercise.id
    ).all()

    if not workout_logs:
        raise HTTPException(status_code=404, detail=f"No logs found for exercise {exercise_name} for user {user_id}")

    return workout_logs

