import axios from "axios";

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000",
  withCredentials: true,
});

// ✅ Chỉ giữ 1 interceptor để trả về response.data
instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Token hết hạn hoặc không hợp lệ. Redirecting to login...");
      window.location.href = "/auth";
    } else if (error.response?.status === 500) {
      console.warn("Server error:", error.response.data);
    }
    return Promise.reject(error);
  }
);

export default instance;
