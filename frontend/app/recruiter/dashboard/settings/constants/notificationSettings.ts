export const notificationSettingsconstItems = [
  {
    title: "Notifications from us",
    description:
      "Receive the latest news, updates and industry tutorials from us.",
    type: "checkbox",
    fields: [
      {
        label: "News and updates",
        description: "News about product and feature updates.",
      },
      {
        label: "Tips and tutorials",
        description: "Tips on getting more out of Tiaago.",
      },
      {
        label: "User research",
        description:
          "Get involved in our beta testing program or participate in paid product user research.",
      },
    ],
  },
  {
    title: "Comments",
    description:
      "These are notifications for comments on your posts and replies to your comments.",
    fields: [
      {
        label: "Do not notify me",
      },
      {
        label: "Important reminders only",
        description: "Only notify me if I'm mentioned in a comment.",
      },
      {
        label: "All reminders",
        description: "Notify me for all comments on my posts.",
        checked: true,
      },
    ],
  },
  {
    title: "Reminders",
    description:
      "These are notifications to remind you of updates you might have missed.",
    fields: [
      {
        label: "Do not notify me",
      },
      {
        label: "Important reminders only",
        description: "Only notify me if the reminder is tagged as important.",
      },
      {
        label: "All reminders",
        description: "Notify me weekly for all reminders.",
        checked: true,
      },
    ],
  },
  {
    title: "More actions",
    description:
      "These are notifications for posts on your profile, likes and other reactions to your posts, and more.",
    fields: [
      {
        label: "Do not notify me",
      },
      {
        label: "All reminders",
        description: "Notify me for all other activities.",
        checked: true,
      },
    ],
  },
];
