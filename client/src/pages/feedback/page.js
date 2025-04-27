import React, { useState } from "react";
import axios from "../../configs/axiosCustomize";
import { MdClose } from "react-icons/md";
import { FaStar } from "react-icons/fa";

const FeedbackPage = ({ storeId }) => {
  const [showModal, setShowModal] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fetchFeedbacks = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/reviews/feedback?page=${page}`);
      // console.log(response.data);
      setFeedbacks(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError("Failed to fetch feedbacks");
    } finally {
      setLoading(false);
    }
  };

  const fetchReputation = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/reviews/reputation/${storeId}`);
      // console.log(response.data);
      setReputation(response.data);
    } catch (err) {
      setError("Failed to fetch reputation");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async () => {
    setShowModal(true);
    await Promise.all([fetchFeedbacks(currentPage), fetchReputation()]);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFeedbacks([]);
    setReputation(null);
    setError(null);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchFeedbacks(newPage);
  };

  return (
    <div className="p-4">
      <button
        onClick={handleOpenModal}
        className="text-xs text-[#0053A0] hover:underline block mt-3"
      >
        See other items
      </button>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl p-6 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
            >
              <MdClose />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-center">
              Feedbacks & Reputation
            </h2>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <p className="text-red-500 text-center">{error}</p>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Reputation</h3>
                  {reputation ? (
                    <div className="flex justify-between items-center p-4 rounded-lg bg-white shadow-md">
                      <div className="flex flex-col items-center text-gray-600 font-medium">
                        <span className="text-sm">Total Feedbacks</span>
                        <span className="font-semibold text-gray-800 text-lg">
                          {reputation.totalFeedbacks}
                        </span>
                      </div>
                      <div className="flex flex-col items-center text-gray-600 font-medium">
                        <span className="text-sm">Positive Feedbacks</span>
                        <span className="font-semibold text-green-600 text-lg">
                          {reputation.positiveFeedbacks}
                        </span>
                      </div>
                      <div className="flex flex-col items-center text-gray-600 font-medium">
                        <span className="text-sm">Reputation Score</span>
                        <span className="font-bold text-blue-600 text-lg">
                          {reputation.reputationScore}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p>No reputation data available.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Feedbacks</h3>
                  {feedbacks.length > 0 ? (
                    <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {feedbacks.map((feedback) => (
                        <li
                          key={feedback._id}
                          className="p-4 border rounded-lg flex items-center gap-4 shadow-sm bg-white"
                        >
                          <div className="flex items-center gap-2 text-yellow-500">
                            <FaStar />
                            <span className="font-medium">
                              {feedback.rating} Stars
                            </span>
                          </div>
                          <p className="text-gray-700 flex-1">
                            {feedback.comment || "No comment"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No feedbacks available.</p>
                  )}

                  <div className="flex justify-center mt-4 space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === 1
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-gray-100 rounded-lg">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === totalPages
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
