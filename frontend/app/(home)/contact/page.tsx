"use client";

import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import Footer from "@/app/common/components/Layout/Footer";
import Link from "next/link";
import Image from "next/image";
import CustomButton from "@/app/common/components/CustomButton";
import { submitContactForm } from "@/app/common/services/support";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  socialLinks,
} from "@/app/common/constants";

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await submitContactForm(formData);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error || "Could not send your message. Please try again.");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <>
      <main className='pt-24'>
        {/* Hero Section */}
        <section className='relative pt-16 md:pt-[102px] pb-14 md:pb-20 bg-[radial-gradient(100%_100%_at_50%_0%,#FFFFFF_70%,#EEEFFF_100%)]'>
          <Image
            src='/assets/images/Pricing Background pattern.png'
            alt='Bg pattern'
            className='object-cover'
            fill
          />
          <div className='md:container mx-auto px-4 relative'>
            <div className='max-w-4xl mx-auto text-center'>
              <h1 className='text-5xl md:text-[60px] font-medium font-onest text-black mb-2.5'>
                Get in touch with us
              </h1>
              <p className='text-lg font-onest max-w-[556px] text-center mx-auto text-[#5F6264] mb-6'>
                Get in touch with our team. We&apos;re here to help you
                transform your hiring process.
              </p>

              <CustomButton
                variant='outline'
                className='bg-white text-sm font-onest py-2.5 px-4 rounded-full'
              >
                <a
                  href='https://cal.com/tiaago/book-a-demo-tiaago-ai-hiring-platform'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center'
                >
                  Book a demo
                </a>
              </CustomButton>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className='py-16 bg-white'>
          <div className='container max-w-[1440px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            {/* Contact Information */}
            <div className='space-y-8 max-w-[480px] p-12'>
              <div>
                <h2 className='text-2xl font-semibold font-onest text-[#101828] mb-4'>
                  Get in Touch
                </h2>
                <p className='text-[#667085] text-lg font-onest mb-8'>
                  We&apos;ll love to hear from you. Our friendly team is always
                  here to chat.
                </p>
              </div>

              <div className='space-y-8'>
                <div className='flex items-start'>
                  <Mail className='w-6 h-6 text-primary mr-4' />
                  <div>
                    <h3 className='font-semibold text-[#101828] text-base font-onest mb-2'>
                      Chat with us
                    </h3>
                    <p className='text-[#475467] text-base font-onest mb-5'>
                      Our friendly team is here to help.
                    </p>
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className='text-primary hover:text-primary-dark text-base font-onest'
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>

                <div className='flex items-start'>
                  <MapPin className='w-6 h-6 text-primary mr-4' />
                  <div>
                    <h3 className='font-semibold text-[#101828] text-base font-onest mb-2'>
                      Office
                    </h3>
                    <p className='text-[#475467] text-base font-onest mb-5'>
                      Come say hello at our office HQ.
                    </p>
                    <div className='text-primary text-base font-onest'>
                      1942 Broadway St, Suite 314C Boulder CO, US
                    </div>
                  </div>
                </div>

                <div className='flex items-start'>
                  <Phone className='w-6 h-6 text-primary mr-4' />
                  <div>
                    <h3 className='font-semibold text-[#101828] text-base font-onest mb-2'>
                      Phone
                    </h3>
                    <p className='text-[#475467] text-base font-onest mb-5'>
                      Mon-Fri from 8am to 5pm.
                    </p>
                    <a
                      href={`tel:${CONTACT_PHONE}`}
                      className='text-primary hover:text-primary-dark text-base font-onest'
                    >
                      {CONTACT_PHONE}
                    </a>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className='flex space-x-4 pt-24'>
                {socialLinks.map(social => (
                  <Link
                    target='_blank'
                    href={social.url}
                    className='text-gray-400 hover:text-primary transition-colors'
                    key={social.url}
                  >
                    <social.Icon className='w-5 h-5' />
                  </Link>
                ))}
              </div>

              {/* Quick Actions */}
              {/* <div className='bg-gray-50 rounded-xl p-6'>
                <h3 className='font-semibold text-gray-900 mb-4'>
                  Quick Actions
                </h3>
                <div className='space-y-3'>
                  <Link
                    href='https://cal.com/tiaago/book-a-demo-tiaago-ai-hiring-platform'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary transition-colors group'
                  >
                    <div className='flex items-center'>
                      <Calendar className='w-5 h-5 text-primary mr-3' />
                      <span className='font-medium text-gray-900'>
                        Book a Demo
                      </span>
                    </div>
                    <ArrowRight className='w-4 h-4 text-gray-400 group-hover:text-primary transition-colors' />
                  </Link>

                  <Link
                    href='/pricing'
                    className='flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary transition-colors group'
                  >
                    <div className='flex items-center'>
                      <DollarSign className='w-5 h-5 text-secondary-2 mr-3' />
                      <span className='font-medium text-gray-900'>
                        View Pricing
                      </span>
                    </div>
                    <ArrowRight className='w-4 h-4 text-gray-400 group-hover:text-primary transition-colors' />
                  </Link>
                </div>
              </div> */}
            </div>

            {/* Contact Form */}
            <div className='flex flex-col items-center justify-center'>
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className='space-y-6'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-8'>
                    <div>
                      <label
                        htmlFor='firstName'
                        className='block text-sm font-medium font-onest text-[#344054] mb-1.5'
                      >
                        First name
                      </label>
                      <input
                        type='text'
                        id='firstName'
                        name='firstName'
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className='w-full px-4 py-3 border border-[#D0D5DD] rounded-lg focus-visible:outline-none placeholder:text-[#667085] text-[#344054] text-base shadow-[0px_1px_2px_0px_#1018280D]'
                        placeholder='John'
                      />
                    </div>
                    <div>
                      <label
                        htmlFor='lastName'
                        className='block text-sm font-medium font-onest text-[#344054] mb-1.5'
                      >
                        Last name
                      </label>
                      <input
                        type='text'
                        id='lastName'
                        name='lastName'
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className='w-full px-4 py-3 border border-[#D0D5DD] rounded-lg focus-visible:outline-none placeholder:text-[#667085] text-[#344054] text-base shadow-[0px_1px_2px_0px_#1018280D]'
                        placeholder='Doe'
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='email'
                      className='block text-sm font-medium font-onest text-[#344054] mb-1.5'
                    >
                      Email
                    </label>
                    <input
                      type='email'
                      id='email'
                      name='email'
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className='w-full px-4 py-3 border border-[#D0D5DD] rounded-lg focus-visible:outline-none placeholder:text-[#667085] text-[#344054] text-base shadow-[0px_1px_2px_0px_#1018280D]'
                      placeholder='john@company.com'
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='message'
                      className='block text-sm font-medium font-onest text-[#344054] mb-1.5'
                    >
                      Message
                    </label>
                    <textarea
                      id='message'
                      name='message'
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleInputChange}
                      className='w-full px-4 py-3 border border-[#D0D5DD] rounded-lg focus-visible:outline-none placeholder:text-[#667085] text-[#344054] text-base shadow-[0px_1px_2px_0px_#1018280D] resize-none'
                      placeholder='Tell us how we can help you...'
                    ></textarea>
                  </div>

                  {/* <div className='flex items-start'>
                    <input
                      type='checkbox'
                      id='consent'
                      name='consent'
                      required
                      checked={formData.consent}
                      onChange={handleInputChange}
                      className='mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded'
                    />
                    <label
                      htmlFor='consent'
                      className='ml-3 text-sm text-gray-600'
                    >
                      I agree to receive communications from Tiaago and
                      understand that I can unsubscribe at any time. *
                    </label>
                  </div> */}

                  <button
                    type='submit'
                    disabled={isSubmitting}
                    className='w-full bg-primary text-white py-3 px-6 rounded-full hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-base font-semibold font-onest mt-8 disabled:opacity-60'
                  >
                    {isSubmitting ? "Sending..." : "Send message"}
                  </button>
                </form>
              ) : (
                <div className='text-center py-8'>
                  <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <CheckCircle className='w-8 h-8 text-primary' />
                  </div>
                  <h3 className='text-xl font-semibold font-onest text-gray-900 mb-2'>
                    Message Sent!
                  </h3>
                  <p className='text-gray-600 text-sm font-onest mb-6'>
                    Thank you for contacting us. We&apos;ll get back to you
                    within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        firstName: "",
                        lastName: "",
                        email: "",
                        message: "",
                      });
                    }}
                    className='text-primary hover:text-primary-dark font-semibold text-base font-onest'
                  >
                    Send Another Message
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Contact;
