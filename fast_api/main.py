from fastapi import FastAPI, Depends
from database import database, engine, metadata
import crud
import schemas

app = FastAPI()
metadata.create_all(bind=engine)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.post("/users/", response_model=schemas.User)
async def create_user(user: schemas.UserCreate):
    user_id = await crud.create_user(user)
    return {"id": user_id, **user.dict()}

@app.get("/users/", response_model=list[schemas.User])
async def read_users():
    return await crud.get_users()
