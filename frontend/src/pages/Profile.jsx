import { Card, Table, Typography } from "antd";

const redemptionHistory = [
  { id: "R-1001", item: "Sticker", cost: "10 PT", status: "Completed" },
  { id: "R-1002", item: "T-Shirt", cost: "80 PT", status: "Pending" },
  { id: "R-1003", item: "Tote Bag", cost: "55 PT", status: "Completed" }
];

const columns = [
  { title: "Order ID", dataIndex: "id", key: "id" },
  { title: "Item", dataIndex: "item", key: "item" },
  { title: "Cost", dataIndex: "cost", key: "cost" },
  { title: "Status", dataIndex: "status", key: "status" }
];

function Profile() {
  return (
    <section className="page-section">
      <Typography.Title level={2}>Profile</Typography.Title>
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={redemptionHistory}
          pagination={false}
        />
      </Card>
    </section>
  );
}

export default Profile;
