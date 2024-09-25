from pydantic import BaseModel, EmailStr


# User creation model (used for creating a user, includes password)
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: str
    surname: str
    role: str


# User response model (used for reading user data, excludes password)
class User(BaseModel):
    id: int
    username: str
    email: EmailStr
    name: str
    surname: str
    role: str

    class Config:
        from_attributes = True  # This is the correct option to use for ORM integration
