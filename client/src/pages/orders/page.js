import { Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Alert, Checkbox, Form, Input, Modal, notification, Radio, Select, Upload } from "antd";

import Footer from "../../components/Footer";
import TopMenu from "../../components/TopMenu";
import MainHeader from "../../components/MainHeader";
import SubMenu from "../../components/SubMenu";
import { getOrders } from "../../apis/order/order";
import { createDispute, deleteDispute, getDisputes } from "../../apis/dispute/dispute";

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const userId = useSelector((state) => state?.auth?.user?._id);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchOrders();
        fetchDisputes();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await getOrders();
            setOrders(response.data);
        } catch (error) {
            notification.error({
                message: "Error",
                description: "Failed to fetch orders. Please try again later.",
            });
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDisputes = async () => {
        try {
            const response = await getDisputes();
            setDisputes(response.data);
        } catch (error) {
            notification.error({
                message: "Error",
                description: "Failed to fetch disputes. Please try again later.",
            });
            console.error("Error fetching disputes:", error);
        }
    };

    const showModal = (orderId, storeId) => {
        setOrderId(orderId);
        setSelectedOrder(storeId);
        setIsModalOpen(true);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const response = await createDispute({
                orderId,
                userId,
                storeId: selectedOrder,
                reason: values.reason,
                description: values.description
            });

            if (response) {
                notification.success({
                    message: "Success",
                    description: "Dispute created successfully",
                });
                fetchDisputes();
                form.resetFields();
                setIsModalOpen(false);
            }
        } catch (error) {
            notification.error({
                message: "Error",
                description: "Failed to create dispute. Please try again.",
            });
            console.error("Error creating dispute:", error);
        }
    };

    const handleDeleteDispute = async (disputeId) => {
        try {
            const response = await deleteDispute(disputeId);
            if (response) {
                notification.success({
                    message: "Success",
                    description: "Dispute deleted successfully",
                });
                fetchDisputes();
            }
        } catch (error) {
            notification.error({
                message: "Error",
                description: "Failed to delete dispute. Please try again.",
            });
            console.error("Error deleting dispute:", error);
        }
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getDeliveryDate = (date) => {
        const deliveryDate = new Date(date);
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        return formatDate(deliveryDate);
    };

    // Find dispute for a specific order
    const getDisputeForOrder = (orderId) => {
        return disputes.find(dispute => dispute.orderId?._id === orderId);
    };

    return (
        <div id="MainLayout" className="min-w-[1050px] max-w-[1300px] mx-auto">
            <div>
                <TopMenu />
                <MainHeader />
                <SubMenu />
            </div>

            <div id="OrdersPage" className="mt-4 max-w-[1200px] mx-auto px-2 min-h-[50vh]">
                <div className="bg-white w-full p-6 min-h-[150px] rounded-lg shadow-sm">
                    <div className="flex items-center text-xl mb-6 border-b pb-4">
                        <Truck className="text-green-500" size={35} />
                        <span className="pl-4 font-semibold">Your Orders</span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-pulse text-gray-500">Loading orders...</div>
                        </div>
                    ) : orders?.length < 1 ? (
                        <div className="flex items-center justify-center py-10 text-gray-500">
                            You have no order history
                        </div>
                    ) : (
                        orders.map((order) => {
                            const orderDispute = getDisputeForOrder(order?._id);

                            return (
                                <div key={order?._id} className="mb-6 border-b border-gray-200 pb-6 last:border-0">
                                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                        <div className="flex justify-between items-start flex-wrap">
                                            <div className="w-full md:w-1/2">
                                                <div className="mb-2">
                                                    <span className="font-bold mr-2 text-gray-700">Order ID:</span>
                                                    <span className="text-sm break-all">{order?._id}</span>
                                                </div>

                                                <div className="mb-2">
                                                    <span className="font-bold mr-2 text-gray-700">Total:</span>
                                                    <span className="text-lg font-semibold text-green-700">£{(order?.total_amount / 100).toFixed(2)}</span>
                                                </div>

                                                <div className="mb-2">
                                                    <span className="font-bold mr-2 text-gray-700">Status:</span>
                                                    <span className={`font-semibold ${order?.status === "Delivered" ? "text-green-600" :
                                                        order?.status === "Processing" ? "text-blue-600" :
                                                            "text-yellow-600"
                                                        }`}>
                                                        {order?.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-1/2 mt-2 md:mt-0">
                                                <div className="mb-2">
                                                    <span className="font-bold mr-2 text-gray-700">Order Date:</span>
                                                    {formatDate(order?.order_date)}
                                                </div>

                                                <div className="mb-2">
                                                    <span className="font-bold mr-2 text-gray-700">Estimated Delivery:</span>
                                                    {getDeliveryDate(order?.updatedAt)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <span className="font-bold text-gray-700">Delivery Address:</span>
                                            <p className="text-gray-600 mt-1">
                                                {order?.user_id?.fullname}, {order?.user_id?.address?.address},
                                                {order?.user_id?.address?.zipcode}, {order?.user_id?.address?.city},
                                                {order?.user_id?.address?.country}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h3 className="font-semibold mb-3 text-gray-700">Order Items</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {order?.items.map((item) => (
                                                <div key={item.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                                    <a href={`/product/${item.productId._id}`} className="block">
                                                        <img
                                                            className="w-full h-40 object-cover"
                                                            src={item.productId.url}
                                                            alt={item.productId.title}
                                                        />
                                                        <div className="p-3">
                                                            <p className="font-medium text-blue-600 hover:underline line-clamp-2">
                                                                {item.productId.title}
                                                            </p>
                                                            <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity || 1}</p>
                                                        </div>
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {orderDispute && (
                                        <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-bold text-lg text-red-700">Dispute Details</h3>
                                                <button
                                                    className="text-red-500 hover:text-red-700 font-medium"
                                                    onClick={() => handleDeleteDispute(orderDispute._id)}
                                                >
                                                    Delete Dispute
                                                </button>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-bold mr-2 text-gray-700">Status:</span>
                                                <span className={`font-semibold ${orderDispute.status === "Resolved" ? "text-green-600" :
                                                    orderDispute.status === "In Progress" ? "text-blue-600" :
                                                        "text-yellow-600"
                                                    }`}>
                                                    {orderDispute.status}
                                                </span>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-gray-700">reason: {orderDispute.reason}</p>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-gray-700"> description: {orderDispute.description}</p>
                                            </div>
                                        </div>
                                    )}

                                    {!orderDispute && (
                                        <div className="mt-4">
                                            <button
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                onClick={() => showModal(order._id, order.items[0].productId.storeId)}
                                            >
                                                Open Dispute
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <Footer />

            <Modal
                title="Create Dispute"
                open={isModalOpen}
                onOk={handleOk}
                onCancel={handleCancel}
                okText="Submit Dispute"
                okButtonProps={{ className: "bg-blue-500" }}
                width={600}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="reason"
                        label="Reason for dispute"
                        rules={[
                            {
                                required: true,
                                message: "Please select a reason for your dispute",
                            },
                        ]}
                    >
                        <Select placeholder="Select reason for dispute">
                            <Select.Option value="damaged_product">Product arrived damaged</Select.Option>
                            <Select.Option value="wrong_item">Received wrong item</Select.Option>
                            <Select.Option value="missing_items">Missing items in order</Select.Option>
                            <Select.Option value="late_delivery">Excessive delivery delay</Select.Option>
                            <Select.Option value="quality_issue">Product quality does not match description</Select.Option>
                            <Select.Option value="refund_issue">Refund not processed</Select.Option>
                            <Select.Option value="other">Other (please specify)</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Please describe the issue with your order"
                        rules={[
                            {
                                required: true,
                                message: "Please provide details about your dispute",
                            },
                        ]}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder="Explain the problem with your order in detail..."
                        />
                    </Form.Item>


                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
                        <h4 className="font-bold mb-1">Important Information:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Our customer service team will review your dispute within 48 hours</li>
                            <li>You will receive email updates about the status of your dispute</li>
                            <li>Providing accurate information and evidence will help resolve your issue faster</li>
                        </ul>
                    </div>

                    <Form.Item
                        name="agreement"
                        valuePropName="checked"
                        rules={[
                            {
                                validator: (_, value) =>
                                    value
                                        ? Promise.resolve()
                                        : Promise.reject(new Error('You must agree to the terms')),
                            },
                        ]}
                    >
                        <Checkbox>I confirm that the information provided is accurate and truthful</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}