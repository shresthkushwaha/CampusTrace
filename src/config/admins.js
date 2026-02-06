// List of admin email addresses
const ADMIN_EMAILS = [
    'kshresth2151@gmail.com',
    // Add more admin emails here as needed
];

export const isAdmin = (userEmail) => {
    if (!userEmail) return false;
    return ADMIN_EMAILS.includes(userEmail.toLowerCase());
};
