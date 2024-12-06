import os
from fastapi import FastAPI, HTTPException, Depends, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

from database import engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated, List, Optional

import crud
import models
import schemas

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

origins = [
    "http://localhost:3000",
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
REFRESH_TOKEN_EXPIRE_DAYS = 10

db_dependency = Annotated[Session, Depends(get_db)]


@app.get("/user/{username}", response_model=schemas.UserResponse, tags=["Users"])
async def get_user_by_username(username: str, db: db_dependency):
    db_user = crud.get_user(db=db, username=username)  # Fetch the user from the DB
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/user/id/{userid}/", response_model=schemas.UserResponse, tags=["Users"])
async def get_user_by_id(userid: int, db: db_dependency):
    db_user = crud.get_user_by_id(db=db, userid=userid)  # Fetch the user from the DB
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED, tags=["Users"])
async def register_user(user: schemas.UserCreate, db: db_dependency):
    db_user = crud.get_user(db=db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="User already exists")
    return crud.create_user(db=db, user=user)


def authenticate_user(username: str, password: str, db: db_dependency):
    user = crud.get_user(db=db, username=username)

    db_user = db.query(models.User).filter(models.User.username == username).first()

    # If user is not found, return None
    if not db_user:
        return False
    if not user or not pwd_context.verify(password, db_user.hashed_password):
        return False
    return user


def create_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@app.post("/token", tags=["Users"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"})
    token_data = {"id": user.id, "username": user.username, "role": user.role}
    access_token = create_token(data=token_data, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}


def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        if username is None:
            raise HTTPException(status_code=403, detail="Token is invalid")
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invalid")


@app.get("/verify-token/{token}", tags=["Users"])
async def verify_user_token(token: str, db: Session = Depends(get_db)):
    payload = verify_token(token=token)
    username = payload.get("username")
    user = crud.get_user(db, username=username)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Token is valid", "access_token": token}


@app.post("/refresh-token", tags=["Users"])
async def refresh_access_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("id")
        username: str = payload.get("username")
        role: str = payload.get("role")
        if user_id is None or username is None or role is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid refresh token")
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        access_token = create_token(
            {"id": user.id, "username": user.username, "role": user.role},
            timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

        return {"access_token": access_token, "token_type": "bearer"}

    except JWTError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid refresh token")


@app.get("/users", response_model=List[schemas.UserResponse], tags=["Users"])
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
        user_id: int = payload.get("id")
        username: str = payload.get("username")
        role: str = payload.get("role")
        if user_id is None or username is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


@app.get("/user/profile", response_model=schemas.UserResponse, tags=["Users"])
async def get_user_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


# Event Endpoints
@app.post("/event", response_model=schemas.Event, status_code=status.HTTP_201_CREATED, tags=["Event"])
async def create_event(event: schemas.EventCreate, db: db_dependency,
                       current_user: models.User = Depends(get_current_user)):
    return crud.create_event(db=db, event=event, user_id=current_user.id)


@app.get("/events", response_model=List[schemas.Event])
async def list_events(db: db_dependency, current_user: models.User = Depends(get_current_user)):
    return crud.get_events(db=db, user_id=current_user.id)


@app.put("/event/{event_id}", response_model=schemas.Event)
async def update_event(event_id: int, event: schemas.EventCreate, db: db_dependency,
                       current_user: models.User = Depends(get_current_user)):
    updated_event = crud.update_event(db, event_id, event, current_user.id)
    if updated_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return updated_event


@app.delete("/event/{event_id}", response_model=dict)
async def delete_event(event_id: int, db: db_dependency, current_user: models.User = Depends(get_current_user)):
    result = crud.delete_event(db, event_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Event not found or permission denied")
    return {"message": "Event deleted successfully"}


# Booking Endpoints
@app.post("/events/{event_id}/pend", response_model=schemas.Booking, status_code=status.HTTP_201_CREATED)
async def book_event(event_id: int, db: db_dependency, current_user: models.User = Depends(get_current_user)):
    return crud.book_event(db=db, event_id=event_id, user_id=current_user.id)


@app.patch("/bookings/{booking_id}/accept")
def update_booking_status_endpoint(
        booking_id: int, db: Session = Depends(get_db)
):
    """
    Endpoint to update the status of a booking.
    """
    return crud.update_booking_status(db, booking_id=booking_id)


@app.delete("/bookings/{booking_id}/cancel", response_model=dict)
async def cancel_booking(booking_id: int, db: db_dependency):
    result = crud.cancel_booking(db, booking_id)
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking cancelled successfully"}

@app.get("/bookings", response_model=List[schemas.Booking])
async def get_all_bookings_endpoint(
    db: db_dependency,
    event_id: Optional[int] = None,
    user_id: Optional[int] = None,
):
    """
    Fetch all bookings, with optional filters for event_id, user_id, and trainer_id.
    """
    bookings = crud.get_all_bookings(db, event_id=event_id, user_id=user_id)
    return bookings

# Update a user
@app.put("/user/{user_id}", response_model=schemas.UserResponse, tags=["Users"])
async def update_user(user_id: int, user: schemas.UserCreate, db: db_dependency):
    db_user = crud.update_user(db, user_id, user)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# Delete a user
@app.delete("/user/{user_id}", response_model=dict, tags=["Users"])
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
        subscription: schemas.SubscriptionCreate,  # Explicitly declare the schema
        db: Session = Depends(get_db)
):
    return crud.create_subscription(db, subscription)


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
def read_workout_plans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                       current_user: models.User = Depends(get_current_user)):
    workout_plans = crud.get_workout_plans(db, user_id=current_user.id, skip=skip, limit=limit)
    return workout_plans


@app.post("/workoutplans/", response_model=schemas.WorkoutPlan)
async def create_workout_plan(
        workoutplan: schemas.WorkoutPlanCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
):
    db_workoutplan = crud.create_workout_plan(db=db, workoutplan=workoutplan, user_id=current_user.id)
    return db_workoutplan


@app.get("/workoutplans/{workout_plan_id}", response_model=schemas.WorkoutPlan)
def read_workout_plan(workout_plan_id: int, db: Session = Depends(get_db)):
    workout_plan = crud.get_workout_plan(db, workout_plan_id)
    if workout_plan is None:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return workout_plan


@app.put("/workoutplans/{workout_plan_id}", response_model=schemas.WorkoutPlan)
def update_workout_plan(workout_plan_id: int, name: str = None, start_time: str = None, end_time: str = None,
                        duration: int = None, db: Session = Depends(get_db)):
    workout_plan = crud.update_workout_plan(db, workout_plan_id, name, start_time, end_time, duration)
    if workout_plan is None:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return workout_plan


@app.post("/workoutplans/{workout_plan_id}/exercises/{exercise_id}", response_model=schemas.WorkoutPlanExercise)
def add_exercise_to_workout_plan(
        workout_plan_id: int,
        exercise_id: int,
        repetitions: Optional[int] = None,
        sets: Optional[int] = None,
        duration: Optional[int] = None,
        db: Session = Depends(get_db)
):
    return crud.add_exercise_to_workout_plan(db, workout_plan_id, exercise_id, repetitions, duration, sets)


# Delete a workout plan
@app.delete("/workoutplans/{workout_plan_id}", status_code=204)
def delete_workout_plan(workout_plan_id: int, db: Session = Depends(get_db)):
    workout_plan = db.query(models.Workout_Plan).filter(models.Workout_Plan.id == workout_plan_id).first()
    if not workout_plan:
        raise HTTPException(status_code=404, detail="Workout Plan not found")

    db.delete(workout_plan)
    db.commit()

    return {"message": "Workout plan deleted"}


# Remove an exercise from a workout plan
@app.delete("/workoutplans/{workout_plan_id}/exercises/{exercise_id}", status_code=204)
def remove_exercise_from_workout_plan(workout_plan_id: int, exercise_id: int, db: Session = Depends(get_db)):
    association = (
        db.query(models.Workout_Plan_Exercise)
        .filter(models.Workout_Plan_Exercise.workout_plan_id == workout_plan_id,
                models.Workout_Plan_Exercise.exercise_id == exercise_id)
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
def update_exercise(exercise_id: int, name: str = None, description: str = None, duration: int = None, sets: int = None,
                    reps: int = None, muscles: str = None, db: Session = Depends(get_db)):
    exercise = crud.update_exercise(db, exercise_id, name, description, duration, sets, reps, muscles)
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
