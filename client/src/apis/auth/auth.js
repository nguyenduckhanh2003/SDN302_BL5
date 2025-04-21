import axios from "../../configs/axiosCustomize";

export const authLogin = async (email, password) => {
    try {
        const response = await axios.post('/auth/login', {
            email: email,
            password: password
        });
        return response;
    } catch (e) {
        return e;
    }
};

export const authGetProfile = async () => {
    try {
        const response = await axios.get('/auth/profile');
        return response;
    } catch (e) {
        return e;
    }
};