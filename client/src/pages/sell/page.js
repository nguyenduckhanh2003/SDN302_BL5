import React, { useState, useEffect } from "react";
import Activity from "./includes/activity";
import Messages from "./includes/messages";
import Account from "./includes/account";
import MainHeader from "../../components/MainHeader";
import TopMenu from "../../components/TopMenu";
import SubMenu from "../../components/SubMenu";
import StoreReputation from "./StoreReputation"; // Import StoreReputation

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

const Sell = () => {
  const [activeTab, setActiveTab] = useState("Activity");
  const [storeInfo, setStoreInfo] = useState(null); // Lưu thông tin store (storeId, storeName)

  // Lấy thông tin store từ user
  useEffect(() => {
    const fetchStoreInfo = async () => {
      const storedUser = localStorage.getItem("currentUser");
      if (!storedUser) return;

      const currentUser = JSON.parse(storedUser);
      try {
        const userResponse = await fetch(
          `http://localhost:4000/user?id=${currentUser.id}`
        );
        if (!userResponse.ok)
          throw new Error("Không thể lấy thông tin người dùng từ server.");
        const userData = await userResponse.json();
        const user = Array.isArray(userData) ? userData[0] : userData;

        // Giả định user có trường stores chứa danh sách store
        const selectedStore =
          user.stores && user.stores.length > 0 ? user.stores[0] : null;
        setStoreInfo(selectedStore);
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };

    fetchStoreInfo();
  }, []);

  // Map tab names to their respective components
  const tabComponents = {
    Activity: <Activity storeInfo={storeInfo} />,
    Messages: <Messages storeInfo={storeInfo} />,
    Account: <Account storeInfo={storeInfo} />,
  };

  return (
    <div id="MainLayout" className="min-w-[1050px] max-w-[1300px] mx-auto">
      {/* Header Section */}
      <div>
        <TopMenu />
        <MainHeader />
        <SubMenu />
      </div>

      {/* Main Content */}
      <div className="flex p-4">
        {/* Main Content Area */}
        <div className="w-3/4 pr-4">
          <h1 className="text-2xl font-bold mb-4">My eBay</h1>
          <div className="flex space-x-4 mb-4">
            {["Activity", "Messages", "Account"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`p-2 ${
                  activeTab === tab
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-700 hover:text-blue-500"
                } transition-colors duration-200`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Render the selected tab's component */}
          <div>{tabComponents[activeTab]}</div>
        </div>

        {/* Right Sidebar */}
        <div className="w-1/4 pl-4">
          {storeInfo && (
            <StoreReputation
              storeId={storeInfo.storeId}
              storeName={storeInfo.storeName}
            />
          )}
          <div className="p-4 border rounded-lg shadow-sm bg-white mt-4">
            <h3 className="text-lg font-bold mb-2 text-gray-800">
              Chat with an Expert Online Now
            </h3>
            <p className="text-gray-600 mb-3 text-sm">
              A Technician Will Answer Your Questions in Minutes. Chat Now.
            </p>
            <div className="flex items-center gap-3 mb-3">
              <img
                src="https://via.placeholder.com/50"
                alt="Support Agent"
                className="rounded-full w-12 h-12"
              />
              <p className="text-sm text-gray-500">JustAnswer</p>
            </div>
            <button className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-between px-4">
              Open <span>▶</span>
            </button>
          </div>
          <div className="mt-4 text-right">
            <a href="#" className="text-blue-500 hover:underline">
              Tell us what you think
            </a>
            <span className="ml-2 text-gray-500">mi_123456 (0) 🗨️</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sell;
