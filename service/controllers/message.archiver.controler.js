/**
 * Message archiving service for older chat messages
 * Provides automated archiving to improve performance with large message history
 */
const mongoose = require("mongoose");
const Message = require("../models/Message");
const ArchivedMessage = require("../models/ArchiveMessage");
const Conversation = require("../models/Conversation");
const { bulkOperationWithRetry } = require("../helper/transaction.helper");
const chatCache = require("../redis/chat.cache");

/**
 * Archive messages older than the specified age
 * @param {number} olderThanDays - Archive messages older than this many days
 * @param {number} batchSize - Number of messages to process in each batch
 * @returns {Promise<Object>} - Statistics about the archiving operation
 */
const archiveOldMessages = async (olderThanDays, batchSize = 500) => {
  const stats = {
    processed: 0,
    archived: 0,
    failed: 0,
    startTime: new Date(),
    endTime: null,
  };

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Tìm trực tiếp tin nhắn cũ thay vì tìm qua conversation
    const oldMessages = await Message.aggregate([
      {
        $match: {
          createdAt: { $lt: cutoffDate },
        },
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 },
        },
      },
    ]);

    const conversationIds = oldMessages.map((item) => item._id);

    console.log(
      `Found ${conversationIds.length} conversations with messages older than ${olderThanDays} days`
    );

    // Process each conversation
    for (const conversationId of conversationIds) {
      await archiveConversationMessages(
        conversationId,
        cutoffDate,
        batchSize,
        stats
      );
    }

    stats.endTime = new Date();
    stats.duration = (stats.endTime - stats.startTime) / 1000; // in seconds

    console.log(
      `Message archiving completed: ${
        stats.archived
      } messages archived in ${stats.duration.toFixed(2)} seconds`
    );

    return stats;
  } catch (error) {
    console.error("Error in archiveOldMessages:", error);
    stats.error = error.message;
    stats.endTime = new Date();
    stats.duration = (stats.endTime - stats.startTime) / 1000;
    throw error;
  }
};

/**
 * Archive messages for a specific conversation
 * @param {string} conversationId - ID of the conversation
 * @param {Date} cutoffDate - Archive messages older than this date
 * @param {number} batchSize - Number of messages to process in each batch
 * @param {Object} stats - Statistics object to update
 */
const archiveConversationMessages = async (
  conversationId,
  cutoffDate,
  batchSize,
  stats
) => {
  try {
    let hasMore = true;

    while (hasMore) {
      // Find messages to archive
      const messagesToArchive = await Message.find({
        conversationId,
        createdAt: { $lt: cutoffDate },
      })
        .limit(batchSize)
        .lean();

      if (messagesToArchive.length === 0) {
        hasMore = false;
        continue;
      }

      stats.processed += messagesToArchive.length;

      // Extract message IDs
      const messageIds = messagesToArchive.map((msg) => msg._id);

      // Convert messages to archived format
      const archivedMessages = messagesToArchive.map((msg) => ({
        ...msg,
        originalId: msg._id,
        _id: new mongoose.Types.ObjectId(), // Generate new IDs for archived messages
      }));

      // Store in archived collection
      await bulkOperationWithRetry(
        ArchivedMessage,
        "insertMany",
        archivedMessages,
        {},
        { bulkOptions: { ordered: false } }
      );

      // Delete original messages
      await bulkOperationWithRetry(
        Message,
        "deleteMany",
        {},
        { _id: { $in: messageIds } },
        { bulkOptions: { ordered: false } }
      );

      // Update stats
      stats.archived += archivedMessages.length;

      // Invalidate related caches
      await chatCache.invalidateConversation(conversationId.toString());

      console.log(
        `Archived ${archivedMessages.length} messages for conversation ${conversationId}`
      );
    }
  } catch (error) {
    console.error(
      `Error archiving messages for conversation ${conversationId}:`,
      error
    );
    stats.failed++;
  }
};

/**
 * Retrieve archived messages for a conversation
 * @param {string} conversationId - ID of the conversation
 * @param {Object} options - Query options (pagination, etc.)
 * @returns {Promise<Array>} - Array of archived messages
 */
const getArchivedMessages = async (conversationId, options = {}) => {
  const {
    page = 1,
    limit = 50,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  try {
    // Get archived messages for the conversation
    const archivedMessages = await ArchivedMessage.find({ conversationId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Count total archived messages for pagination
    const totalCount = await ArchivedMessage.countDocuments({ conversationId });

    return {
      messages: archivedMessages,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    console.error("Error retrieving archived messages:", error);
    throw error;
  }
};

/**
 * Schedule regular archiving of old messages
 * @param {number} intervalHours - Interval between archiving runs (hours)
 * @param {number} olderThanDays - Archive messages older than this many days
 */
const scheduleArchiving = (intervalHours, olderThanDays) => {
  // Convert hours to milliseconds
  const interval = 1000 * 10; // 10 seconds for testing, change to 1000 * 60 * 60 * intervalHours for production

  console.log(
    `Scheduling message archiving every ${intervalHours} hours for messages older than ${olderThanDays} days`
  );

  // Schedule the first run
  setTimeout(() => {
    runArchiving(interval, olderThanDays);
  }, 10 * 60 * 1000); // Start first run after 10 minutes of server startup
};

/**
 * Run archiving process and schedule next run
 * @param {number} interval - Interval between runs (milliseconds)
 * @param {number} olderThanDays - Archive messages older than this many days
 */
const runArchiving = async (interval, olderThanDays) => {
  try {
    console.log("Starting scheduled message archiving...");
    const stats = await archiveOldMessages(olderThanDays);
    console.log("Scheduled archiving completed:", stats);
  } catch (error) {
    console.error("Error in scheduled archiving:", error);
  } finally {
    // Schedule next run regardless of success/failure
    setTimeout(() => {
      runArchiving(interval, olderThanDays);
    }, interval);
  }
};

module.exports = {
  archiveOldMessages,
  getArchivedMessages,
  scheduleArchiving,
};
