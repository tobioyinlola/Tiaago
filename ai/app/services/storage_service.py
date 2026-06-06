# Assessment Storage Service - Database Operations for Assessment IDs

from typing import Optional, Dict, List
from app.models.assessment import MultiStageAssessment, AssessmentResult, StageResult
import json
import logging

logger = logging.getLogger(__name__)

class AssessmentStorage:
    """
    Storage service for managing assessment IDs and data.
    
    In production, this would use a real database (PostgreSQL, MongoDB, etc.)
    For now, using in-memory storage as example implementation.
    """
    
    def __init__(self):
        # In-memory storage (replace with database in production)
        self.assessments: Dict[str, MultiStageAssessment] = {}
        self.stage_results: Dict[str, List[StageResult]] = {}
        self.candidate_assessments: Dict[str, List[str]] = {}  # candidate_id -> assessment_ids
    
    def store_assessment(self, assessment: MultiStageAssessment) -> str:
        """
        Store a complete multi-stage assessment by its ID.
        
        Args:
            assessment: MultiStageAssessment object with generated ID
            
        Returns:
            assessment_id: The stored assessment ID for reference
        """
        try:
            assessment_id = assessment.assessment_id
            self.assessments[assessment_id] = assessment
            self.stage_results[assessment_id] = []  # Initialize empty results
            
            logger.info(f"Stored assessment {assessment_id} for role: {assessment.role_type}")
            return assessment_id
            
        except Exception as e:
            logger.error(f"Error storing assessment: {str(e)}")
            raise
    
    def get_assessment(self, assessment_id: str) -> Optional[MultiStageAssessment]:
        """
        Retrieve a complete assessment by ID.
        
        Args:
            assessment_id: The unique assessment identifier
            
        Returns:
            MultiStageAssessment object or None if not found
        """
        return self.assessments.get(assessment_id)
    
    def get_current_stage_questions(self, assessment_id: str) -> Optional[Dict]:
        """
        Get questions for the current stage of an assessment.
        
        Args:
            assessment_id: The unique assessment identifier
            
        Returns:
            Dictionary with current stage questions and metadata
        """
        assessment = self.get_assessment(assessment_id)
        if not assessment:
            return None
        
        # Determine current stage based on completed stages
        completed_stages = set(assessment.stage_completed)
        
        if "mcq" not in completed_stages:
            # Return MCQ questions
            return {
                "assessment_id": assessment_id,
                "current_stage": "mcq",
                "next_stage": "coding",
                "questions": assessment.mcq_assessment.questions if assessment.mcq_assessment else [],
                "ai_determined_difficulty": assessment.ai_determined_difficulty,
                "skills_assessed": assessment.mcq_assessment.skills_assessed if assessment.mcq_assessment else [],
                "question_count": len(assessment.mcq_assessment.questions) if assessment.mcq_assessment else 0
            }
        elif "coding" not in completed_stages:
            # Return coding questions
            return {
                "assessment_id": assessment_id,
                "current_stage": "coding", 
                "next_stage": None,
                "questions": assessment.coding_assessment.questions if assessment.coding_assessment else [],
                "ai_determined_difficulty": assessment.ai_determined_difficulty,
                "skills_assessed": assessment.coding_assessment.skills_assessed if assessment.coding_assessment else [],
                "question_count": len(assessment.coding_assessment.questions) if assessment.coding_assessment else 0
            }
        else:
            # Both stages completed
            return {
                "assessment_id": assessment_id,
                "current_stage": "completed",
                "next_stage": None,
                "message": "Assessment fully completed",
                "ai_determined_difficulty": assessment.ai_determined_difficulty
            }
    
    def record_stage_completion(self, assessment_id: str, stage: str, stage_result: StageResult):
        """
        Record completion of a stage and update assessment progress.
        
        Args:
            assessment_id: The unique assessment identifier
            stage: Stage that was completed ("mcq" or "coding")
            stage_result: Results from grading the stage
        """
        try:
            # Store the stage result
            if assessment_id not in self.stage_results:
                self.stage_results[assessment_id] = []
            
            self.stage_results[assessment_id].append(stage_result)
            
            # Update assessment completion status
            assessment = self.get_assessment(assessment_id)
            if assessment and stage not in assessment.stage_completed:
                assessment.stage_completed.append(stage)
                assessment.current_stage = "coding" if stage == "mcq" else "completed"
                
            logger.info(f"Recorded {stage} completion for assessment {assessment_id}")
            
        except Exception as e:
            logger.error(f"Error recording stage completion: {str(e)}")
            raise
    
    def get_stage_results(self, assessment_id: str) -> List[StageResult]:
        """
        Get all completed stage results for an assessment.
        
        Args:
            assessment_id: The unique assessment identifier
            
        Returns:
            List of StageResult objects
        """
        return self.stage_results.get(assessment_id, [])
    
    def link_candidate_to_assessment(self, candidate_id: str, assessment_id: str):
        """
        Link a candidate to an assessment for tracking purposes.
        
        Args:
            candidate_id: Unique candidate identifier
            assessment_id: Unique assessment identifier
        """
        if candidate_id not in self.candidate_assessments:
            self.candidate_assessments[candidate_id] = []
        
        if assessment_id not in self.candidate_assessments[candidate_id]:
            self.candidate_assessments[candidate_id].append(assessment_id)
    
    def get_candidate_assessments(self, candidate_id: str) -> List[str]:
        """
        Get all assessment IDs for a specific candidate.
        
        Args:
            candidate_id: Unique candidate identifier
            
        Returns:
            List of assessment IDs
        """
        return self.candidate_assessments.get(candidate_id, [])
    
    def cleanup_expired_assessments(self, days_old: int = 30):
        """
        Clean up old assessments (in production, this would be a scheduled job).
        
        Args:
            days_old: Remove assessments older than this many days
        """
        # Implementation would check creation timestamps and remove old data
        pass

# Global storage instance (in production, use dependency injection)
assessment_storage = AssessmentStorage()

# Database implementation example (for production use)
class DatabaseAssessmentStorage:
    """
    Production database implementation using SQLAlchemy or similar ORM.
    """
    
    def __init__(self, db_session):
        self.db = db_session
    
    def store_assessment(self, assessment: MultiStageAssessment) -> str:
        """Store assessment in database."""
        # SQL: INSERT INTO assessments (id, job_description, ai_determined_difficulty, ...)
        pass
    
    def get_assessment(self, assessment_id: str) -> Optional[MultiStageAssessment]:
        """Retrieve assessment from database.""" 
        # SQL: SELECT * FROM assessments WHERE id = assessment_id
        pass
    
    def record_stage_completion(self, assessment_id: str, stage: str, stage_result: StageResult):
        """Record stage completion in database."""
        # SQL: INSERT INTO stage_results (assessment_id, stage, results, ...)
        # SQL: UPDATE assessments SET stage_completed = ... WHERE id = assessment_id
        pass 