// Notification.tsx or Notification.jsx

import React, { useEffect, useState } from 'react';

const Notification = ({ companyId }) => {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = () => {
    fetch(`http://127.0.0.1:8000/api/notifications/${companyId}/`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          setNotifications(data);
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    const interval = setInterval(fetchNotifications, 10000); // every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const markAsRead = () => {
    fetch(`http://127.0.0.1:8000/api/notifications/${companyId}/`, {
      method: 'POST',
    }).then(() => setNotifications([]));
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">New Dealer Notifications</h3>
      {notifications.length > 0 ? (
        <>
          <ul className="list-disc ml-6">
            {notifications.map((dealer, i) => (
              <li key={i}>
                New Dealer: <strong>{dealer.name}</strong> ({dealer.email})
              </li>
            ))}
          </ul>
          <button className="mt-2 px-3 py-1 bg-blue-500 text-white rounded" onClick={markAsRead}>
            Mark as Read
          </button>
        </>
      ) : (
        <p>No new dealers</p>
      )}
    </div>
  );
};

export default Notification;
