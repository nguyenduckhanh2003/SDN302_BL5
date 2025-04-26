import axios from "../../configs/axiosCustomize";

export const getProducts = async () => {
  try {
    const response = await axios.get("/api/products");
    return response;
  } catch (e) {
    return e;
  }
};

export const getProductsById = async (id) => {
  try {
    const response = await axios.get(`/api/product/${id}`);
    return response;
  } catch (e) {
    return e;
  }
};
