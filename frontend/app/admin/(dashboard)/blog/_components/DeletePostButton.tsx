"use client";

import { toast } from "sonner";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import { deleteBlogPost } from "@/app/common/services/blog-admin";

const DeletePostButton = ({
  id,
  title,
  redirectTo,
  labeled = false,
}: {
  id: ID;
  title: string;
  redirectTo?: string;
  labeled?: boolean;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteBlogPost(id);
      if (result.success) {
        toast.success("Post deleted");
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
      setConfirming(false);
    });
  };

  if (confirming) {
    return (
      <div className='flex items-center gap-2 justify-center'>
        <span className='text-xs text-gray-500'>Delete &quot;{title}&quot;?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className='text-xs font-semibold text-error'
        >
          {isPending ? "..." : "Yes"}
        </button>
        <button onClick={() => setConfirming(false)} className='text-xs text-gray-500'>
          No
        </button>
      </div>
    );
  }

  if (labeled) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className='btn btn-outline btn-error gap-2 w-full'
        type='button'
      >
        <Trash2 className='h-4 w-4' /> Delete post
      </button>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className='text-gray-400 hover:text-error transition-colors'
      aria-label='Delete post'
    >
      <Trash2 className='h-4 w-4' />
    </button>
  );
};

export default DeletePostButton;
