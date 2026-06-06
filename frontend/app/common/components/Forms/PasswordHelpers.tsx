import { PiCheckCircleFill } from "react-icons/pi";
import { IoAlertCircleOutline } from "react-icons/io5";

const helpers = [
  {
    text: "Enter a password containing at least 8 characters",
    validate: (val = "") => val.length >= 8,
  },
  {
    text: "Password must contain an upper case character",
    validate: (val = "") => /[A-Z]/.test(val),
  },
  {
    text: "Password must contain a lower case character",
    validate: (val = "") => /[a-z]/.test(val),
  },
  {
    text: "Password must contain a number character",
    validate: (val = "") => /[0-9]/.test(val),
  },
  {
    text: "Password must contain a special character",
    validate: (val = "") => val && !/^[A-Za-z0-9 ]+$/.test(val),
  },
];

const PasswordHelpers = ({ value = "" }) => {
  return (
    <div className='my-2 transition flex flex-col gap-2'>
      {helpers.map(({ text, validate }) => (
        <div
          className='flex items-center gap-1 text-xs text-[#5A5F66]'
          key={text}
        >
          {validate(value) ? (
            <PiCheckCircleFill className='text-success text-base' />
          ) : (
            <IoAlertCircleOutline className='text-base' />
          )}
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
};

export default PasswordHelpers;
