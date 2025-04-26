import axios from "../../configs/axiosCustomize";

export const getOrders = async () => {
    try {
        const response = await axios.get("/api/orders");
        return response;
    } catch (e) {
        return e;
    }
};