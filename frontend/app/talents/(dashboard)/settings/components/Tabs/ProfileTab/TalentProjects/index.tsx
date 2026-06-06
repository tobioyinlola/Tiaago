"use client";

import { toast } from "sonner";
import { TrashIcon } from "lucide-react";

import { ID } from "@/app/common/types";
import ProjectModalForm from "./ProjectModalForm";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import ProjectDisplay from "@/app/common/components/ProjectDisplay";
import { deletePortfolioProject } from "@/app/common/services/talents";

const TalentProjects = () => {
  const [projects, removeProject] = useTalentStore(s => [
    s.portfolio?.projects || [],
    s.removeProject,
  ]);
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async (id: ID) => {
    try {
      const res = await deletePortfolioProject(id);
      if (!res.success) {
        throw new Error(res.error);
      } else {
        toast.success("Project deleted successfully");
        removeProject(id);
      }
    } catch (error) {
      setTimeout(() => {
        handleFormSubmissionError(error, undefined, setAlert);
      }, 100);
    }
  };

  const onClick = (id: ID) =>
    setAlert({
      title: "Are you sure?",
      message: "Do you want to delete this project?",
      icon: "warning",
      buttonText: "Delete",
      buttonAction: () => handleDelete(id),
      buttonClassName: "btn-error text-white",
    });

  return (
    <section
      id='projects'
      className='w-full max-md:max-w-md max-md:mx-auto dashboard-content-constraint'
    >
      <h2 className='text-base font-bold text-primary-black'>Projects</h2>
      <p className='text-sm text-secondary-black mb-6 md:border-b border-outline pb-4'>
        Kindly enter your projects that stand out.
      </p>

      <div className='flex items-center gap-3 flex-wrap'>
        {projects.map((p, i) => (
          <ProjectDisplay project={p} key={i} className='w-full relative'>
            <button
              className='absolute top-2 btn btn-sm btn-circle btn-error text-xl right-2 z-[2]'
              onClick={() => onClick(p.id)}
            >
              <TrashIcon />
            </button>
          </ProjectDisplay>
        ))}
        {!projects.length && (
          <p className='text-sm text-secondary-black'>No projects added yet.</p>
        )}
      </div>
      <div className='w-full flex justify-end mt-5'>
        <ProjectModalForm buttonClassName='ml-auto btn-primary text-sm' />
      </div>
    </section>
  );
};

export default TalentProjects;
