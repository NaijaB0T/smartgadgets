-- Create cart table for persistent shopping carts
CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(255) NOT NULL,
    customer_id INTEGER,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(cart_id, product_id)
);

-- Create pickup locations table
CREATE TABLE IF NOT EXISTS pickup_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    business_hours TEXT, -- JSON format for complex schedules
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default pickup locations for Liberia
INSERT INTO pickup_locations (name, address, phone, business_hours, sort_order) VALUES
('Monrovia Main Store', 'Broad Street, Monrovia, Montserrado County', '+231-777-123-456', '{"mon_fri": "9:00-18:00", "sat": "9:00-15:00", "sun": "closed"}', 1),
('Paynesville Branch', 'Paynesville Red Light Market, Montserrado County', '+231-777-123-457', '{"mon_sat": "8:00-17:00", "sun": "closed"}', 2);

-- Create notifications table for tracking customer communications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    customer_id INTEGER,
    type TEXT NOT NULL CHECK (type IN ('sms', 'email', 'whatsapp')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    provider VARCHAR(50), -- twilio, sendgrid, etc.
    provider_id VARCHAR(255), -- External provider message ID
    error_message TEXT,
    sent_at DATETIME,
    delivered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create reviews table for customer feedback
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    customer_id INTEGER,
    order_id INTEGER,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Create discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
    value INTEGER NOT NULL, -- Percentage (1-100) or amount in cents
    minimum_order_amount INTEGER DEFAULT 0,
    maximum_discount_amount INTEGER, -- Cap for percentage discounts
    usage_limit INTEGER, -- Total usage limit
    usage_limit_per_customer INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    starts_at DATETIME,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert promotional codes from user requirements
INSERT INTO discount_codes (code, description, type, value, minimum_order_amount, is_active) VALUES
('SMART10', 'First Purchase Discount - 10% off your first order', 'percentage', 10, 0, TRUE),
('FREEDEL100', 'Free delivery on orders above $100', 'fixed_amount', 0, 10000, TRUE); -- $100 in cents

-- Create indexes for performance
CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_carts_customer ON carts(customer_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_notifications_order ON notifications(order_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_approved ON reviews(is_approved);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active);