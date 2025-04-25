const Order = require('../models/Order');
const Product = require('../models/Product');

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { user_id, items, shipping_address, payment_method, notes } = req.body;
        
        // Validate items and calculate total
        let total_amount = 0;
        const orderItems = [];
        
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ error: `Product ${item.productId} not found` });
            }
            
            if (product.quantity < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for product ${product.title}` });
            }
            
            total_amount += product.price * item.quantity;
            orderItems.push({
                productId: item.productId,
                quantity: item.quantity,
                price: product.price
            });
        }
        
        const order = new Order({
            user_id,
            items: orderItems,
            total_amount,
            shipping_address,
            payment_method,
            notes,
            status: 'pending'
        });
        
        await order.save();
        
        // Update product quantities
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: -item.quantity }
            });
        }
        
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all orders (with filtering and pagination)
exports.getAllOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 10, sort = '-createdAt', userId } = req.query;
        
        const query = {};
        if (status) query.status = status;
        if (userId) query.user_id = userId;
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            populate: [
                { path: 'user_id', select: 'name email' },
                { path: 'items.productId', select: 'title price' }
            ]
        };
        
        const orders = await Order.paginate(query, options);
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get single order
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user_id', 'name email phone')
            .populate('items.productId', 'title price images');
            
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, tracking_number } = req.body;
        
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status, tracking_number },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending orders can be cancelled' });
        }
        
        // Restore product quantities
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: item.quantity }
            });
        }
        
        order.status = 'cancelled';
        await order.save();
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get order statistics
exports.getOrderStats = async (req, res) => {
    try {
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$total_amount" },
                    pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                    processing: { $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] } },
                    shipped: { $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] } },
                    delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalOrders: 1,
                    totalRevenue: 1,
                    statusCounts: {
                        pending: "$pending",
                        processing: "$processing",
                        shipped: "$shipped",
                        delivered: "$delivered",
                        cancelled: "$cancelled"
                    }
                }
            }
        ]);
        
        res.json(stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            statusCounts: {
                pending: 0,
                processing: 0,
                shipped: 0,
                delivered: 0,
                cancelled: 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};