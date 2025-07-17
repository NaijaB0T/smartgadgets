-- Create categories table for product organization
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(500),
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Insert default categories for SmartGadgets
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Phones', 'phones', 'Smartphones and mobile devices', 1),
('Computers', 'computers', 'Laptops, desktops and computing devices', 2),
('Accessories', 'accessories', 'Phone cases, chargers, and tech accessories', 3);