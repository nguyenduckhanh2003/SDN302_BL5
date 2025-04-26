import axios from "../../configs/axiosCustomize";

export const getDisputes = async () => {
    try {
        const response = await axios.get("/api/disputes");
        return response;
    } catch (e) {
        return e;
    }
};

export const createDispute = async ({ orderId, userId, storeId, reason, description }) => {
    try {
        const response = await axios.post('/api/disputes', {
            orderId,
            userId,
            storeId,
            reason,
            description
        });
        return response.data;
    } catch (e) {
        return e.response?.data || { error: 'Lỗi không xác định' };
    }
};

export const deleteDispute = async (id) => {
    try {
        const response = await axios.delete(`/api/disputes/${id}`);
        return response.data;
    } catch (e) {
        return e.response?.data || { error: 'Lỗi không xác định' };
    }
};

export const getDisputesByStore = async () => {
    try {
        const response = await axios.get("/api/disputes/store");
        return response;
    } catch (e) {
        return e;
    }
};

export const getDisputesByStoreById = async (disputeId) => {
    try {
        const response = await axios.get("/api/disputes/store/" + disputeId);
        return response;
    } catch (e) {
        return e;
    }
};

export const updateDispute = async (disputeId, status, resolution) => {
    try {
        const response = await axios.patch(`/api/disputes/${disputeId}/reply`, { status, resolution });
        return response;
    } catch (e) {
        return e;
    }
};

