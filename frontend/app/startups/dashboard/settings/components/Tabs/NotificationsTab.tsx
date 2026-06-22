import { cn, toId } from "@/app/common/utils";
import { notificationSettingsconstItems } from "../../constants/notificationSettings";

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  console.log(data);
};

const NotificationsTab = () => {
  return (
    <div className='max-md:px-4'>
      <h2 className='text-gray-900 text-base font-bold'>Email Notifications</h2>
      <p className='text-sm text-gray-500 mb-5'>
        Get emails to find out what&apos;s going on when you&apos;re not online.
        You can turn them off anytime.
      </p>
      <form onSubmit={handleSubmit}>
        {notificationSettingsconstItems.map(
          ({ title, description, type = "radio", fields }, i) => (
            <div
              key={i}
              className={cn(
                "flex max-md:flex-col justify-between py-5 border-t border-gray-200 gap-5",
                i === 0 && "pt-6"
              )}
            >
              <div>
                <h3 className='text-gray-900 text-sm font-bold'>{title}</h3>
                <p className='text-sm text-gray-500'>{description}</p>
              </div>
              <div className='flex flex-col gap-4'>
                {fields?.map(
                  (
                    {
                      label,
                      description,
                      checked,
                    }: {
                      label: string;
                      description?: string;
                      checked?: boolean;
                    },
                    i
                  ) => (
                    <div key={i} className='md:w-80 form-control'>
                      <label
                        htmlFor={toId(`${title} ${label}`)}
                        className='label cursor-pointer justify-start gap-2'
                      >
                        <input
                          type={type}
                          name={toId(title)}
                          id={toId(`${title} ${label}`)}
                          value={toId(label)}
                          className={cn(
                            type === "radio" && "radio radio-primary radio-xs",
                            type === "checkbox" &&
                              "checkbox checkbox-primary checkbox-xs rounded-[4px]"
                          )}
                          defaultChecked={checked}
                        />
                        <span className='label-text text-gray-700 font-medium'>
                          {label}
                        </span>
                      </label>
                      {description && (
                        <p className='text-sm text-gray-500 ml-7'>
                          {description}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )
        )}
        <div className='mt-2 w-2/3 md:w-fit max-md:mx-auto'>
          <button type='submit' className='btn btn-primary w-full'>
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationsTab;
