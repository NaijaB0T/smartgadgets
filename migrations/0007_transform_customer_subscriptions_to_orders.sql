-- Transform customer_subscriptions to orders system
-- Backup existing data
CREATE TABLE customer_subscriptions_backup AS SELECT * FROM customer_subscriptions;

-- Drop and recreate as orders table
DROP TABLE customer_subscriptions;

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number VARCHAR(20) NOT NULL UNIQUE, -- Human-readable order number
    customer_id INTEGER NOT NULL,
    
    -- Contact information (for guest checkout)
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Order totals
    subtotal INTEGER NOT NULL, -- Sum of line items
    tax_amount INTEGER DEFAULT 0,
    shipping_amount INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    
    -- Shipping information
    shipping_method TEXT DEFAULT 'pickup' CHECK (shipping_method IN ('pickup', 'delivery')),
    shipping_address TEXT,
    pickup_location VARCHAR(255),
    delivery_instructions TEXT,
    
    -- Payment information
    payment_method TEXT NOT NULL CHECK (payment_method IN ('mobile_money', 'card', 'cash_on_delivery', 'bank_transfer')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
    payment_reference VARCHAR(255),
    
    -- Order status and fulfillment
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Order placed, awaiting payment confirmation
        'confirmed',         -- Payment confirmed, order being prepared
        'ready_for_pickup',  -- Ready for customer pickup
        'out_for_delivery',  -- Driver assigned and out for delivery
        'delivered',         -- Successfully delivered/picked up
        'cancelled',         -- Order cancelled
        'refunded'          -- Order refunded
    )),
    
    -- Important dates
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    ready_at DATETIME,
    delivered_at DATETIME,
    
    -- Notes and tracking
    admin_notes TEXT,
    customer_notes TEXT,
    tracking_number VARCHAR(100),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create order items table for multiple products per order
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL, -- Store name at time of order
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL, -- Price at time of order
    total_price INTEGER NOT NULL, -- quantity * unit_price
    product_attributes TEXT, -- JSON of product specs at time of order
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Create indexes for performance
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Generate order numbers function (trigger)
CREATE TRIGGER generate_order_number 
AFTER INSERT ON orders 
WHEN NEW.order_number IS NULL OR NEW.order_number = ''
BEGIN
    UPDATE orders 
    SET order_number = 'SG' || printf('%06d', NEW.id)
    WHERE id = NEW.id;
END;