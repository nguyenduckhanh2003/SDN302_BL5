import React, { useEffect, useState } from 'react';
import {
    Table, Card, Typography, Tag, Space, Button, Avatar, Spin, Alert, Tooltip,
    Modal, Descriptions, Divider, notification, List, Timeline, Form, Input,
    Radio, Empty
} from 'antd';
import {
    EyeOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ShoppingOutlined, FileTextOutlined, UserOutlined, MessageOutlined,
    ReloadOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import TopMenu from '../../components/TopMenu';
import { getDisputesByStore, getDisputesByStoreById, updateDispute } from '../../apis/dispute/dispute';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function DisputeManage() {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [resolveModalVisible, setResolveModalVisible] = useState(false);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [resolveForm] = Form.useForm();
    const [resolveLoading, setResolveLoading] = useState(false);

    useEffect(() => {
        fetchDisputes();
    }, []);

    const fetchDisputes = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getDisputesByStore();
            setDisputes(response.data);
        } catch (error) {
            console.error("Error fetching disputes:", error);
            setError("Failed to load disputes. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const getStatusTag = (status) => {
        switch (status) {
            case 'open':
                return <Tag color="warning">Open</Tag>;
            case 'resolved':
                return <Tag color="success">Closed</Tag>;
            case 'rejected':
                return <Tag color="error">Rejected</Tag>;
            default:
                return <Tag color="default">{status}</Tag>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (error) {
            console.error("Date formatting error:", error);
            return 'Invalid date';
        }
    };

    const handleViewDetails = async (disputeId) => {
        try {
            setDetailsLoading(true);
            const response = await getDisputesByStoreById(disputeId);
            if (response.data) {
                setSelectedDispute(response.data);
                setDetailsVisible(true);
            }
        } catch (error) {
            console.error("Error fetching dispute details:", error);
            notification.error({
                message: 'Error',
                description: 'Failed to load dispute details. Please try again.',
            });
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleResolve = (dispute) => {
        setSelectedDispute(dispute);
        setResolveModalVisible(true);
        resolveForm.resetFields();
    };

    const handleResolveSubmit = async (values) => {
        setResolveLoading(true);

        try {
            const response = await updateDispute(selectedDispute._id, values.status, values.resolution);
            if (response.data) {
                // Refresh the selected dispute with updated data
                setSelectedDispute(response.data);

                // Refresh the disputes list
                await fetchDisputes();

                // Close the resolve modal
                setResolveModalVisible(false);

                // Show success notification
                notification.success({
                    message: 'Dispute Updated',
                    description: `Dispute has been successfully ${values.status === 'resolved' ? 'resolved' : 'rejected'}.`,
                });
            }
        } catch (error) {
            console.error("Error updating dispute:", error);
            notification.error({
                message: 'Failed to Update',
                description: 'An error occurred while updating the dispute. Please try again.',
            });
        } finally {
            setResolveLoading(false);
        }
    };

    const columns = [
        {
            title: 'Customer',
            dataIndex: 'userId',
            key: 'userId',
            render: (userId) => {
                if (!userId) return <Text type="secondary">Unknown</Text>;
                return (
                    <Space>
                        <Avatar src={userId.avatar} alt={userId.fullname}>
                            {userId.fullname ? userId.fullname.charAt(0) : 'U'}
                        </Avatar>
                        <div>
                            <Text strong>{userId.fullname || 'Unknown'}</Text>
                            <div>
                                <Text type="secondary">{userId.email || 'No email'}</Text>
                            </div>
                        </div>
                    </Space>
                );
            },
        },
        {
            title: 'Order ID',
            dataIndex: 'orderId',
            key: 'orderId',
            render: (orderId) => {
                if (!orderId || !orderId._id) return <Text type="secondary">N/A</Text>;
                return (
                    <Tooltip title={orderId._id}>
                        {orderId._id.substring(0, 8)}...
                    </Tooltip>
                );
            },
        },
        {
            title: 'Date',
            dataIndex: 'orderId',
            key: 'date',
            render: (orderId) => formatDate(orderId?.order_date),
            sorter: (a, b) => {
                if (!a.orderId?.order_date || !b.orderId?.order_date) return 0;
                return new Date(a.orderId.order_date) - new Date(b.orderId.order_date);
            },
        },
        {
            title: 'Amount',
            dataIndex: 'orderId',
            key: 'amount',
            render: (orderId) => {
                if (!orderId || !orderId.total_amount) return <Text type="secondary">N/A</Text>;
                return `$${orderId.total_amount.toFixed(2)}`;
            },
            sorter: (a, b) => {
                if (!a.orderId?.total_amount || !b.orderId?.total_amount) return 0;
                return a.orderId.total_amount - b.orderId.total_amount;
            },
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            render: (text) => text || <Text type="secondary">No reason</Text>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (text) => text || <Text type="secondary">No description</Text>,
        },
        {
            title: 'Resolution',
            dataIndex: 'resolution',
            key: 'resolution',
            ellipsis: true,
            render: (text) => text || <Text type="secondary">No resolution</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => getStatusTag(status || 'unknown'),
            filters: [
                { text: 'Open', value: 'open' },
                { text: 'Closed', value: 'closed' },
                { text: 'Resolved', value: 'resolved' },
                { text: 'Rejected', value: 'rejected' },
                { text: 'Processing', value: 'processing' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetails(record._id)}
                        loading={detailsLoading && selectedDispute?._id === record._id}
                    >
                        Details
                    </Button>
                    {record.status === 'open' && (
                        <Button
                            type="link"
                            icon={<CheckCircleOutlined />}
                            style={{ color: '#52c41a' }}
                            onClick={() => handleResolve(record)}
                        >
                            Resolve
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    // Render order items for the selected dispute
    const renderOrderItems = () => {
        if (!selectedDispute || !selectedDispute.orderId || !selectedDispute.orderId.items || selectedDispute.orderId.items.length === 0) {
            return <Empty description="No order items found" />;
        }

        const items = selectedDispute.orderId.items;

        return (
            <List
                itemLayout="horizontal"
                dataSource={items}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<Avatar icon={<ShoppingOutlined />} />}
                            title={`Product ID: ${item.productId || 'Unknown'}`}
                            description={
                                <div>
                                    <div>Quantity: {item.quantity || 1}</div>
                                    <div>Price: ${item.price ? item.price.toFixed(2) : "N/A"}</div>
                                    <div>Feedback: {item.feedbackSubmitted ? "Submitted" : "Not Submitted"}</div>
                                </div>
                            }
                        />
                    </List.Item>
                )}
            />
        );
    };

    // Details modal for viewing dispute details
    const renderDetailsModal = () => {
        if (!selectedDispute) return null;

        const isOpenDispute = selectedDispute.status === 'open';

        return (
            <Modal
                title={
                    <Space>
                        <span>Dispute Details</span>
                        {getStatusTag(selectedDispute.status)}
                    </Space>
                }
                open={detailsVisible}
                onCancel={() => setDetailsVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailsVisible(false)}>
                        Close
                    </Button>,
                    isOpenDispute && (
                        <Button
                            key="resolve"
                            type="primary"
                            onClick={() => {
                                setDetailsVisible(false);
                                handleResolve(selectedDispute);
                            }}
                        >
                            Resolve This Dispute
                        </Button>
                    )
                ].filter(Boolean)}
                width={700}
            >
                {detailsLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <Spin tip="Loading dispute details..." />
                    </div>
                ) : (
                    <>
                        <Descriptions bordered column={1}>
                            <Descriptions.Item label="Dispute ID">
                                {selectedDispute._id}
                            </Descriptions.Item>
                            <Descriptions.Item label="Customer">
                                {selectedDispute.userId ? (
                                    <Space>
                                        <Avatar src={selectedDispute.userId.avatar}>
                                            {selectedDispute.userId.fullname ? selectedDispute.userId.fullname.charAt(0) : 'U'}
                                        </Avatar>
                                        {selectedDispute.userId.fullname || 'Unknown'}
                                        {selectedDispute.userId.email && `(${selectedDispute.userId.email})`}
                                    </Space>
                                ) : (
                                    <Text type="secondary">Unknown customer</Text>
                                )}
                            </Descriptions.Item>
                            {selectedDispute.userId && selectedDispute.userId.address && (
                                <Descriptions.Item label="Customer Address">
                                    {[
                                        selectedDispute.userId.address.street,
                                        selectedDispute.userId.address.city,
                                        selectedDispute.userId.address.country,
                                        selectedDispute.userId.address.zipcode
                                    ].filter(Boolean).join(', ') || 'No address provided'}
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item label="Order Date">
                                {selectedDispute.orderId && selectedDispute.orderId.order_date ?
                                    formatDate(selectedDispute.orderId.order_date) : 'N/A'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Total Amount">
                                {selectedDispute.orderId && selectedDispute.orderId.total_amount ?
                                    `$${selectedDispute.orderId.total_amount.toFixed(2)}` : 'N/A'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Dispute Reason">
                                {selectedDispute.reason || "Not specified"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Description">
                                {selectedDispute.description || "No description provided"}
                            </Descriptions.Item>
                            {selectedDispute.resolution && (
                                <Descriptions.Item label="Resolution">
                                    {selectedDispute.resolution}
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        <Divider orientation="left">Order Items</Divider>
                        {renderOrderItems()}

                        <Divider orientation="left">Dispute Timeline</Divider>
                        <Timeline
                            items={[
                                {
                                    dot: <ShoppingOutlined style={{ fontSize: '16px' }} />,
                                    children: (
                                        <>
                                            <Text strong>Order Placed</Text>
                                            <p>{selectedDispute.orderId && selectedDispute.orderId.createdAt ?
                                                formatDate(selectedDispute.orderId.createdAt) : 'N/A'}</p>
                                        </>
                                    ),
                                },
                                {
                                    dot: <FileTextOutlined style={{ fontSize: '16px' }} />,
                                    children: (
                                        <>
                                            <Text strong>Dispute Filed</Text>
                                            <p>{selectedDispute.orderId && selectedDispute.orderId.updatedAt ?
                                                formatDate(selectedDispute.orderId.updatedAt) : 'N/A'}</p>
                                        </>
                                    ),
                                },
                                ...(selectedDispute.status !== 'open' ? [
                                    {
                                        dot: selectedDispute.status === 'resolved' || selectedDispute.status === 'closed' ?
                                            <CheckCircleOutlined style={{ fontSize: '16px', color: 'green' }} /> :
                                            <CloseCircleOutlined style={{ fontSize: '16px', color: 'red' }} />,
                                        children: (
                                            <>
                                                <Text
                                                    strong
                                                    type={selectedDispute.status === 'resolved' || selectedDispute.status === 'closed' ?
                                                        "success" : "danger"}
                                                >
                                                    Dispute {selectedDispute.status === 'resolved' || selectedDispute.status === 'closed' ?
                                                        'Resolved' : 'Rejected'}
                                                </Text>
                                                <p>{new Date().toLocaleDateString()}</p>
                                            </>
                                        ),
                                    }
                                ] : []),
                            ]}
                        />
                    </>
                )}
            </Modal>
        );
    };

    // Resolve modal for submitting resolution
    const renderResolveModal = () => {
        if (!selectedDispute) return null;

        return (
            <Modal
                title={
                    <Space>
                        <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                        <span>Resolve Dispute</span>
                    </Space>
                }
                open={resolveModalVisible}
                onCancel={() => setResolveModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={resolveForm}
                    layout="vertical"
                    onFinish={handleResolveSubmit}
                    initialValues={{ status: 'resolved' }}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Text>
                            You are about to resolve dispute for order <Text strong>{selectedDispute.orderId?._id?.substring(0, 8) || 'Unknown'}</Text> filed by <Text strong>{selectedDispute.userId?.fullname || 'Unknown'}</Text>.
                        </Text>
                    </div>

                    <Form.Item
                        name="status"
                        label="Resolution"
                        rules={[{ required: true, message: 'Please select a resolution status' }]}
                    >
                        <Radio.Group>
                            <Radio value="resolved">Accept Dispute</Radio>
                            <Radio value="rejected">Reject Dispute</Radio>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        name="resolution"
                        label="Resolution Details"
                        rules={[{ required: true, message: 'Please enter resolution details' }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Explain your decision and any actions taken..."
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button onClick={() => setResolveModalVisible(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={resolveLoading}
                            >
                                Submit Resolution
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        );
    };

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>
            <TopMenu />

            <div style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 16px' }}>
                <Card bordered={false} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Title level={2}>Dispute Management</Title>
                            <Text type="secondary">
                                Manage customer disputes for your store
                            </Text>
                        </div>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchDisputes}
                            loading={loading}
                        >
                            Refresh
                        </Button>
                    </div>
                </Card>

                {error ? (
                    <Alert
                        message="Error"
                        description={error}
                        type="error"
                        showIcon
                        action={
                            <Button size="small" type="primary" onClick={fetchDisputes}>
                                Try Again
                            </Button>
                        }
                        style={{ marginBottom: 24 }}
                    />
                ) : (
                    <Card bordered={false}>
                        <Table
                            dataSource={disputes}
                            columns={columns}
                            rowKey="_id"
                            loading={loading}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50']
                            }}
                            locale={{ emptyText: 'No disputes found' }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Card>
                )}

                {renderDetailsModal()}
                {renderResolveModal()}
            </div>
        </div>
    );
}

export default DisputeManage;