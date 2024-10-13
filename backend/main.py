import os
from fastapi import FastAPI, HTTPException, Depends, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

from database import engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated, List

import crud
import models
import schemas

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

origins = [
    "http://localhost:3000",
    "https://yourfrontenddomain.com",
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
