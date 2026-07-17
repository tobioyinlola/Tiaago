export const formatBlogDate = (dateString: string | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getInitials = (name?: string) => {
  if (!name) return "T";
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};
