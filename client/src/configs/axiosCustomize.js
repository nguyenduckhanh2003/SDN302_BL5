import axios from "axios";

const instance = axios.create({
    baseURL: "http://localhost:4000",
    withCredentials: true,
});

instance.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 500) {
            console.warn("Server error:", error.response.data);
        }
        return Promise.reject(error);
    }
);


instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.error("Token hết hạn hoặc không hợp lệ. Redirecting to login...");
            window.location.href = "/auth";
        }
        return Promise.reject(error);
    }
);

export default instance;
