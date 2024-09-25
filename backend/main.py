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
        data={"sub": user.username},
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
async def verify_user_token(token: str):
    verify_token(token=token)
    return {"message": "Token is valid"}


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
    return user


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


