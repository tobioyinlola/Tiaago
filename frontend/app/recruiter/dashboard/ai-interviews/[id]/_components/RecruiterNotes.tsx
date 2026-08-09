"use client";

import { useState } from "react";
import { toast } from "sonner";

import DaisyButton from "@/app/common/components/DaisyButton";
import { ID } from "@/app/common/types";
import { updateAIInterviewNotes, type AIInterviewDetail } from "@/app/common/services/ai-interviews";

const RecruiterNotes = ({
  interviewId,
  interview,
  onSaved,
}: {
  interviewId: ID;
  interview: AIInterviewDetail;
  onSaved: (interview: AIInterviewDetail) => void;
}) => {
  const [notes, setNotes] = useState(interview.recruiter_notes);
  const [saving, setSaving] = useState(false);

  const dirty = notes !== interview.recruiter_notes;

  const handleSave = async () => {
    setSaving(true);
    const res = await updateAIInterviewNotes(interviewId, notes);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Notes saved");
    onSaved(res.data);
  };

  return (
    <div className='rounded-2lg border border-[#EAECF0] bg-white p-6'>
      <h3 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-2'>
        Notes / candidate feedback
      </h3>
      <textarea
        value={notes}
        onChange={event => setNotes(event.target.value)}
        rows={4}
        className='textarea textarea-bordered w-full text-sm'
        placeholder='Add any notes for your team, or feedback you want on file for this candidate...'
      />
      <div className='flex justify-end mt-3'>
        <DaisyButton color='primary' variant='outline' disabled={!dirty || saving} onClick={handleSave}>
          Save notes
        </DaisyButton>
      </div>
    </div>
  );
};

export default RecruiterNotes;
