-- Transform existing subscriptions table to products table
-- First, backup existing data if needed
CREATE TABLE subscriptions_backup AS SELECT * FROM subscriptions;

-- Drop existing subscriptions table and recreate as products
DROP TABLE subscriptions;

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    price INTEGER NOT NULL, -- Price in cents/minor units
    compare_at_price INTEGER, -- Original price for discounts
    cost_price INTEGER, -- Cost for profit calculations
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    category_id INTEGER,
    brand VARCHAR(100),
    model VARCHAR(100),
    
    -- Inventory management
    track_inventory BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    allow_backorder BOOLEAN DEFAULT FALSE,
    
    -- Physical properties
    weight DECIMAL(8,2), -- Weight in grams
    dimensions_length DECIMAL(8,2), -- Dimensions in cm
    dimensions_width DECIMAL(8,2),
    dimensions_height DECIMAL(8,2),
    
    -- SEO and metadata
    meta_title VARCHAR(255),
    meta_description TEXT,
    search_keywords TEXT,
    
    -- Media
    featured_image VARCHAR(500),
    gallery_images TEXT, -- JSON array of image URLs
    
    -- Status and visibility
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock', 'discontinued')),
    is_featured BOOLEAN DEFAULT FALSE,
    is_digital BOOLEAN DEFAULT FALSE,
    requires_shipping BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock ON products(stock_quantity);