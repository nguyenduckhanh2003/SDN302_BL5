import axiosCustomize from "../../configs/axiosCustomize";

const API_URL = '/api/orders';

const orderApi = axiosCustomize;

orderApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

orderApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/auth';
        }
        return Promise.reject(error);
    }
);

export const orderService = {
    async getOrders(params = {}) {
        try {
            const data = await orderApi.get(API_URL, { params }); // KHÔNG cần `.data` nữa
            return data; // đã là response.data từ interceptor rồi
          } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
          }
    },

    async getOrderStats() {
        try {
            const data = await orderApi.get(`${API_URL}/stats`);
            return data;
          } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
          }
    },
};
