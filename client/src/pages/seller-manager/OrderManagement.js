import React, { useEffect, useState } from 'react';
import { orderService } from '../../apis/ordermanager/orderService';
import { 
  FiPackage, FiClock, FiTruck, 
  FiCheckCircle, FiXCircle, FiSearch,
  FiEdit, FiEye, FiDollarSign
} from 'react-icons/fi';
import { Modal, Badge, Alert } from 'react-bootstrap';
import moment from 'moment';
import 'moment/locale/vi'; // Cho ngôn ngữ tiếng Việt

moment.locale('vi');

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: 'all',
    sort: '-createdAt',
    search: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { page, limit } = pagination;
      const { status, sort, search } = filters;
  
      const params = {
        page,
        limit,
        sort,
        status: status === 'all' ? '' : status,
        search,
      };
  
      const data = await orderService.getOrders(params);
      console.log("DEBUG - data response từ API:", data);
      // ✅ Kiểm tra rõ ràng và gán giá trị mặc định an toàn
      if (data && Array.isArray(data.docs)) {
        setOrders(data.docs);
        setPagination(prev => ({
          ...prev,
          total: data.totalDocs || 0,
          pages: data.totalPages || 1,
        }));
      } else {
        console.error("Phản hồi API không có cấu trúc mong đợi:", data);
        setOrders([]);
        setError("Dữ liệu đơn hàng không hợp lệ");
      }
    } catch (error) {
      setError("Lỗi khi tải danh sách đơn hàng");
      console.error("Lỗi lấy đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await orderService.getOrderStats();
      setStats(data);
    } catch (error) {
      console.error('Lỗi lấy thống kê:', error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setActionLoading(true);
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      fetchOrders();
      fetchStats(); // Refresh stats after update
    } catch (error) {
      setError(`Lỗi khi cập nhật trạng thái: ${error.message}`);
    } finally {
      setActionLoading(false);
      setShowDetail(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [pagination.page, filters.status, filters.sort, filters.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'warning', text: 'Chờ xử lý', icon: <FiClock /> },
      processing: { variant: 'info', text: 'Đang xử lý', icon: <FiClock /> },
      shipped: { variant: 'primary', text: 'Đang giao', icon: <FiTruck /> },
      delivered: { variant: 'success', text: 'Đã giao', icon: <FiCheckCircle /> },
      cancelled: { variant: 'danger', text: 'Đã hủy', icon: <FiXCircle /> }
    };
    
    return statusConfig[status] || { variant: 'secondary', text: status, icon: null };
  };

  const getPaymentMethod = (method) => {
    const methods = {
      cod: 'Thanh toán khi nhận hàng',
      bank_transfer: 'Chuyển khoản ngân hàng',
      momo: 'Ví điện tử MoMo',
      vnpay: 'VNPay'
    };
    return methods[method] || method;
  };

  return (
    <div className="container-fluid py-4">
      <h1 className="mb-4 d-flex align-items-center">
        <FiPackage className="me-2" /> Quản lý Đơn hàng
      </h1>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      {/* Stats Cards */}
      <div className="row mb-4">
        {stats && (
          <>
            <div className="col-md-3 mb-3">
              <div className="card border-start border-primary border-3 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <FiPackage className="text-primary fs-3 me-2" />
                    <div>
                      <h6 className="text-muted mb-0">Tổng đơn hàng</h6>
                      <h3 className="mb-0">{stats.totalOrders}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3 mb-3">
              <div className="card border-start border-warning border-3 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <FiClock className="text-warning fs-3 me-2" />
                    <div>
                      <h6 className="text-muted mb-0">Chờ xử lý</h6>
                      <h3 className="mb-0">{stats.statusCounts.pending}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3 mb-3">
              <div className="card border-start border-info border-3 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <FiTruck className="text-info fs-3 me-2" />
                    <div>
                      <h6 className="text-muted mb-0">Đang giao</h6>
                      <h3 className="mb-0">{stats.statusCounts.shipped}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3 mb-3">
              <div className="card border-start border-success border-3 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <FiCheckCircle className="text-success fs-3 me-2" />
                    <div>
                      <h6 className="text-muted mb-0">Hoàn thành</h6>
                      <h3 className="mb-0">{stats.statusCounts.delivered}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="shipped">Đang giao</option>
                  <option value="delivered">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Sắp xếp</label>
                <select
                  className="form-select"
                  value={filters.sort}
                  onChange={(e) => setFilters({...filters, sort: e.target.value})}
                >
                  <option value="-createdAt">Mới nhất trước</option>
                  <option value="createdAt">Cũ nhất trước</option>
                  <option value="-total_amount">Giá trị cao nhất</option>
                  <option value="total_amount">Giá trị thấp nhất</option>
                </select>
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Tìm kiếm</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm theo mã đơn, tên KH, SĐT..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                  <button 
                    className="btn btn-primary" 
                    type="submit"
                    disabled={loading}
                  >
                    <FiSearch /> Tìm kiếm
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Order Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Sản phẩm</th>
                    <th className="text-end">Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th>Ngày đặt</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      const statusInfo = getStatusBadge(order.status);
                      return (
                        <tr key={order._id}>
                          <td>
                            <strong>#{order._id.substring(0, 8)}</strong>
                          </td>
                          <td>
                            <div className="fw-semibold">{order.user_id?.fullname || 'Khách hàng'}</div>
                            <small className="text-muted">{order.shipping_address}</small>
                          </td>
                          <td>
                            {order.items[0]?.productId?.name || 'Sản phẩm'}
                            {order.items.length > 1 && ` +${order.items.length - 1} SP khác`}
                          </td>
                          <td className="text-end fw-bold text-primary">
                            {order.total_amount.toLocaleString()}đ
                          </td>
                          <td>
                            <Badge bg={statusInfo.variant} className="d-flex align-items-center gap-1">
                              {statusInfo.icon}
                              {statusInfo.text}
                            </Badge>
                          </td>
                          <td>
                            {moment(order.createdAt).format('DD/MM/YYYY HH:mm')}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowDetail(true);
                                }}
                              >
                                <FiEye /> Chi tiết
                              </button>
                              {order.status === 'pending' && (
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => updateOrderStatus(order._id, 'cancelled')}
                                  disabled={actionLoading}
                                >
                                  <FiXCircle /> Hủy
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <div className="text-muted">Không tìm thấy đơn hàng nào</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {orders.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-4">
          <div className="text-muted">
            Hiển thị từ {(pagination.page - 1) * pagination.limit + 1} đến{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số{' '}
            {pagination.total} đơn hàng
          </div>
          
          <nav>
            <ul className="pagination mb-0">
              <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                  disabled={pagination.page === 1}
                >
                  Trước
                </button>
              </li>
              
              {[...Array(Math.min(5, pagination.pages)).keys()].map(num => (
                <li 
                  key={num} 
                  className={`page-item ${pagination.page === num + 1 ? 'active' : ''}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setPagination({...pagination, page: num + 1})}
                  >
                    {num + 1}
                  </button>
                </li>
              ))}
              
              <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                  disabled={pagination.page === pagination.pages}
                >
                  Sau
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết đơn hàng #{selectedOrder?._id.substring(0, 8)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <div className="row">
              <div className="col-md-6">
                <h5 className="mb-3">Thông tin khách hàng</h5>
                <div className="mb-3">
                  <label className="form-label">Tên khách hàng</label>
                  <p className="fw-semibold">{selectedOrder.user_id?.fullname || 'Khách hàng'}</p>
                </div>
                <div className="mb-3">
                  <label className="form-label">Địa chỉ giao hàng</label>
                  <p className="fw-semibold">{selectedOrder.shipping_address}</p>
                </div>
              </div>
              
              <div className="col-md-6">
                <h5 className="mb-3">Thông tin đơn hàng</h5>
                <div className="mb-3">
                  <label className="form-label">Ngày đặt hàng</label>
                  <p className="fw-semibold">
                    {moment(selectedOrder.createdAt).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label">Phương thức thanh toán</label>
                  <p className="fw-semibold">
                    {getPaymentMethod(selectedOrder.payment_method)}
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label">Trạng thái</label>
                  <div>
                    <Badge bg={getStatusBadge(selectedOrder.status).variant} className="fs-6">
                      {getStatusBadge(selectedOrder.status).text}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="col-12 mt-3">
                <h5 className="mb-3">Sản phẩm đã đặt</h5>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th className="text-end">Đơn giá</th>
                        <th className="text-center">Số lượng</th>
                        <th className="text-end">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productId?.name || `Sản phẩm ${index + 1}`}</td>
                          <td className="text-end">{item.price.toLocaleString()}đ</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end fw-semibold">
                            {(item.price * item.quantity).toLocaleString()}đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" className="text-end fw-bold">Tổng cộng:</td>
                        <td className="text-end fw-bold text-primary fs-5">
                          {selectedOrder.total_amount.toLocaleString()}đ
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {selectedOrder.notes && (
                <div className="col-12 mt-3">
                  <label className="form-label">Ghi chú</label>
                  <p className="fw-semibold">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex gap-2">
            {selectedOrder?.status === 'pending' && (
              <button
                className="btn btn-danger"
                onClick={() => updateOrderStatus(selectedOrder._id, 'cancelled')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Đang xử lý...' : 'Hủy đơn hàng'}
              </button>
            )}
            
            {selectedOrder?.status === 'pending' && (
              <button
                className="btn btn-primary"
                onClick={() => updateOrderStatus(selectedOrder._id, 'processing')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận đơn hàng'}
              </button>
            )}
            
            {selectedOrder?.status === 'processing' && (
              <button
                className="btn btn-success"
                onClick={() => {
                  const tracking = prompt('Nhập mã vận đơn:');
                  if (tracking) {
                    updateOrderStatus(selectedOrder._id, 'shipped', tracking);
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận đã giao'}
              </button>
            )}
            
            <button 
              className="btn btn-outline-secondary" 
              onClick={() => setShowDetail(false)}
            >
              Đóng
            </button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OrderManagement;