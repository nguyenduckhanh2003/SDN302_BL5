export const caseNavigate = (str) => {
    switch (str) {
        case 'admin':
            return '/adminDashboard';
        case 'user':
            return '/';
        case 'seller':
            return '/sell';
        default:
            return '/';
    }
}