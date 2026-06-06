# app/main.py
from fastapi import FastAPI
from app.api.routes import router as api_router
from app.config import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Resume Analysis and Assessment API",
    description="API for analyzing resumes and generating assessments",
    version="1.0.0",
)

app.include_router(api_router, prefix="/api/v1")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)