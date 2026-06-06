import os
import shutil
from fastapi import UploadFile
from app.config import settings

async def save_upload_file_tmp(upload_file: UploadFile) -> str:
    try:
        temp_file = os.path.join(settings.TEMP_FILE_DIR, upload_file.filename)
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return temp_file
    finally:
        upload_file.file.close()

def remove_temp_file(file_path: str):
    if os.path.exists(file_path):
        os.remove(file_path)