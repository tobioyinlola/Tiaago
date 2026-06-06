"use client";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { FiEdit } from "react-icons/fi";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";

import {
  projectFormValidationSchema,
  projectFormFields,
  initialValues,
} from "./form.constants";

import {
  createPortfolioProject,
  updatePortfolioProject,
} from "@/app/common/services/talents";
import { useAlert } from "@/app/common/store/useAlert";
import { TalentPortfolioProject } from "@/app/common/types";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import { ButtonModal, ModalProps } from "@/app/common/components/Modal";

type ProjectModalFormProps = {
  refresh?: boolean;
  buttonClassName?: string;
  project?: TalentPortfolioProject;
  modalRef?: ModalProps["modalRef"];
};

const ProjectModalForm = ({
  refresh = false,
  buttonClassName = "btn-primary",
  project,
  modalRef,
}: ProjectModalFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const __modalRef = useRef<HTMLDialogElement>(null);
  const _modalRef = modalRef ?? __modalRef;
  const [projects, addProject, setProjects] = useTalentStore(s => [
    s.portfolio?.projects ?? [],
    s.addProject,
    s.setProjects,
  ]);
  const setAlert = useAlert(state => state.setAlert);

  return (
    <ButtonModal
      buttonText={project ? undefined : "Add"}
      icon={
        !project ? undefined : <FiEdit className='text-xl text-[#7F7F7F]' />
      }
      id={
        project ? `edit-project-${project.name}-modal` : "create-project-modal"
      }
      buttonClassName={buttonClassName}
      modalRef={_modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          {project ? `Edit Project` : "Create Project"}
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Kindly {project ? `edit` : "fill in"} the details for the Project
        </p>
      </div>
      <Formik
        initialValues={{
          ...initialValues,
          ...(project && {
            name: project.name,
            image: project.image,
            link: project.link,
          }),
        }}
        onSubmit={(values, { setFieldError, resetForm }) => {
          setLoading(true);
          const modal = _modalRef.current;
          if (project) {
            updatePortfolioProject(project.id, values)
              .then(res => {
                if (!res.success) throw Error(res.error);
                sonnerToast.success("Project updated successfully");
                if (!project) resetForm();
                if (res.data)
                  setProjects(
                    projects.map(p => (p.id === project.id ? res.data : p))
                  );
                modal?.close();
                if (refresh) router.refresh();
              })
              .catch(err =>
                handleFormSubmissionError(err, setFieldError, setAlert)
              )
              .finally(() => setLoading(false));
          } else {
            createPortfolioProject(values)
              .then(res => {
                if (!res.success) throw Error(res.error);
                sonnerToast.success("Project created successfully");
                if (!project) resetForm();
                if (res.data) addProject(res.data);
                modal?.close();
                if (refresh) router.refresh();
              })
              .catch(err =>
                handleFormSubmissionError(err, setFieldError, setAlert)
              )
              .finally(() => setLoading(false));
          }
        }}
        validationSchema={projectFormValidationSchema}
      >
        {({ handleSubmit, errors, touched, values }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            <div className='flex-wrap md:flex justify-between'>
              {projectFormFields.map(({ name, ...props }) => {
                return (
                  <FormikField
                    key={name}
                    name={name}
                    value={values[name]}
                    error={errors[name]}
                    touched={touched[name]}
                    {...props}
                  />
                );
              })}
            </div>
            <Button
              loading={loading}
              color='primary'
              className='text-white w-full my-5'
              type='submit'
            >
              {loading ? "Submitting..." : project ? "Update" : "Create"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default ProjectModalForm;
