const Dispute = require("../models/Dispute");

const createDispute = async (req, res) => {
    const { orderId, userId, storeId, reason, description } = req.body;

    try {
        const checkDispute = await Dispute.findOne({ orderId: orderId });
        if (checkDispute) {
            return res.status(400).json({ error: 'Bạn đã tạo yêu cầu hoàn trả trên' });
        }
        const dispute = await Dispute.create({
            orderId,
            userId,
            storeId,
            reason,
            description
        });

        res.status(201).json({
            success: true,
            data: dispute
        });
    } catch (error) {
        res.status(500).json({ error: 'Tạo yêu cầu hoàn trả thất bại', details: error.message });
    }
};
const getDispute = async (req, res) => {
    try {
        const userId = req.user._id;
        const disputes = await Dispute.find({ userId: userId }).populate().populate("orderId").populate("userId").populate("storeId");
        res.status(200).json({
            success: true,
            data: disputes
        });
    } catch (error) {
        res.status(500).json({ error: 'Lấy yêu cầu hoàn trả thất bại', details: error.message });
    }
};

const updateDispute = async (req, res) => {
    const { disputeId } = req.params;
    const { description, reason } = req.body;

    try {
        const checkDispute = await Dispute.findById(disputeId);
        if (!checkDispute) {
            return res.status(400).json({ error: 'Yêu cầu hoàn trả không tìm thấy' });
        }
        const dispute = await Dispute.findByIdAndUpdate(disputeId, {
            description,
            reason
        }, { new: true });

        res.status(201).json({
            success: true,
            data: dispute
        });
    } catch (error) {
        res.status(500).json({ error: 'Tạo yêu cầu hoàn trả thất bại', details: error.message });
    }
};
const deleteDispute = async (req, res) => {
    const { disputeId } = req.params;

    try {
        const checkDispute = await Dispute.findById(disputeId);
        if (!checkDispute) {
            return res.status(400).json({ error: 'Yêu cầu hoàn trả không tìm thấy' });
        }
        if (checkDispute.status !== "open") {
            return res.status(400).json({ error: 'Yêu cầu hoàn trả đã được giải quyết' });
        }
        await Dispute.findByIdAndDelete(disputeId);
        res.status(200).json({ message: 'Xoa yeu cau hoan tra thanh cong' });
    } catch (error) {
        res.status(500).json({ error: 'Xoa yêu cầu hoàn trả thất bại', details: error.message });
    }
};

const getDisputeByStore = async (req, res) => {
    try {
        const storeId = req.user.store._id;
        const disputes = await Dispute.find({ storeId: storeId }).populate("orderId").populate("userId").populate("storeId");
        res.status(200).json({
            success: true,
            data: disputes
        });
    } catch (error) {
        res.status(500).json({ error: 'Lấy yêu cầu hoàn trả thất bại', details: error.message });
    }
};

const getDisputeByStoreById = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const storeId = req.user.store._id;

        const dispute = await Dispute.findOne({ _id: disputeId, storeId })
            .populate("orderId")
            .populate("userId")
            .populate("storeId");

        if (!dispute) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy yêu cầu hoàn trả cho cửa hàng này."
            });
        }

        res.status(200).json({
            success: true,
            data: dispute
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lấy yêu cầu hoàn trả thất bại.",
            error: error.message
        });
    }
};


const replyDispute = async (req, res) => {
    const { disputeId } = req.params;
    const { resolution, status } = req.body;

    try {
        const checkDispute = await Dispute.findById(disputeId);
        if (!checkDispute) {
            return res.status(400).json({ error: 'Yêu cầu hoàn trả không tìm thấy' });
        }
        const dispute = await Dispute.findByIdAndUpdate(disputeId, {
            resolution,
            status
        }, { new: true });

        res.status(201).json({
            success: true,
            data: dispute
        });
    } catch (error) {
        res.status(500).json({ error: 'Tạo yêu cầu hoàn trả thất bại', details: error.message });
    }
};


module.exports = { createDispute, getDispute, getDisputeByStore, updateDispute, deleteDispute, replyDispute, getDisputeByStoreById };