@router.post("/analyze_resume/", response_model=ResumeAnalysis)
async def analyze_resume_endpoint(
    resume: UploadFile = File(...),
    job_description: str = ""
):
    file_path = None
    try:
        # Validate file size (example: 10MB limit)
        file_size = await resume.read()
        await resume.seek(0)  # Reset file pointer
        if len(file_size) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="File too large")
            
        # Save the uploaded file temporarily
        file_path = await save_upload_file_tmp(resume)
        
        # Extract text from the resume
        resume_text = extract_text(file_path)
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from resume")
            
        # Preprocess the extracted text
        processed_text = preprocess_text(resume_text)
        
        # Analyze the resume
        try:
            analysis_result = analyze_resume(processed_text, job_description)
            return analysis_result
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")
    finally:
        # Clean up the temporary file
        if file_path:
            remove_temp_file(file_path)