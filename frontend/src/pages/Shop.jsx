import { Button, Card, Col, Row, Space, Tag, Typography, message } from "antd";

const products = [
  {
    id: 1,
    name: "Sticker",
    price: 10,
    stock: 120,
    image:
      "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2,
    name: "T-Shirt",
    price: 80,
    stock: 36,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 3,
    name: "Tote Bag",
    price: 55,
    stock: 48,
    image:
      "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80"
  }
];

function Shop() {
  const handleRedeem = (product) => {
    message.success(`Redeem request created for ${product.name}`);
  };

  return (
    <section className="page-section">
      <Typography.Title level={2}>Shop</Typography.Title>
      <Row gutter={[20, 20]}>
        {products.map((product) => (
          <Col xs={24} md={8} key={product.id}>
            <Card
              className="product-card"
              cover={<img alt={product.name} src={product.image} />}
              actions={[
                <Button type="primary" onClick={() => handleRedeem(product)}>
                  Redeem
                </Button>
              ]}
            >
              <Space direction="vertical" size={10} className="full-width">
                <Typography.Title level={4}>{product.name}</Typography.Title>
                <Space wrap>
                  <Tag color="green">{product.price} PT</Tag>
                  <Tag>{product.stock} in stock</Tag>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
}

export default Shop;
