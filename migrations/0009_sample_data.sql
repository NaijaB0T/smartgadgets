-- Insert sample products for testing
INSERT INTO products (
    name, slug, description, short_description, price, compare_at_price,
    sku, category_id, brand, model, stock_quantity, featured_image,
    status, is_featured, weight
) VALUES
(
    'iPhone 15 Pro',
    'iphone-15-pro',
    'The iPhone 15 Pro features a titanium design with the A17 Pro chip, delivering exceptional performance and battery life. It includes a 48MP main camera system, USB-C connectivity, and the Action Button for customizable controls.',
    'Latest iPhone with titanium design and A17 Pro chip',
    119900, -- $1199.00 in cents
    129900, -- $1299.00 in cents
    'IPH15P-128-NAT',
    1, -- Phones category
    'Apple',
    'iPhone 15 Pro',
    25,
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1692845702708',
    'active',
    1, -- featured
    187 -- weight in grams
),
(
    'Samsung Galaxy S24 Ultra',
    'samsung-galaxy-s24-ultra',
    'The Galaxy S24 Ultra combines cutting-edge AI with the iconic S Pen experience. Featuring a 200MP camera, titanium frame, and the most powerful Galaxy chipset ever.',
    'Premium Android flagship with S Pen and 200MP camera',
    109900, -- $1099.00 in cents
    119900, -- $1199.00 in cents
    'SAM-S24U-256-TIT',
    1, -- Phones category
    'Samsung',
    'Galaxy S24 Ultra',
    18,
    'https://images.samsung.com/is/image/samsung/p6pim/us/2401/gallery/us-galaxy-s24-ultra-s928-sm-s928bzkeues-thumb-539573053',
    'active',
    1, -- featured
    232 -- weight in grams
),
(
    'MacBook Air M3',
    'macbook-air-m3',
    'The new MacBook Air with M3 chip delivers exceptional performance and all-day battery life in an incredibly thin and light design. Perfect for work, creativity, and entertainment.',
    'Ultra-thin laptop with M3 chip and all-day battery',
    109900, -- $1099.00 in cents
    NULL,
    'MBA-M3-13-256-SLV',
    2, -- Computers category
    'Apple',
    'MacBook Air',
    12,
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-13-midnight-select-20220606?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1653084303665',
    'active',
    0, -- not featured
    1290 -- weight in grams
),
(
    'Wireless Charging Stand',
    'wireless-charging-stand',
    'Fast wireless charging stand compatible with iPhone, Samsung, and other Qi-enabled devices. Adjustable angle for comfortable viewing while charging.',
    'Fast wireless charging stand with adjustable angle',
    3999, -- $39.99 in cents
    4999, -- $49.99 in cents
    'WCS-15W-BLK',
    3, -- Accessories category
    'SmartGadgets',
    'Pro Charger',
    50,
    NULL,
    'active',
    0, -- not featured
    280 -- weight in grams
);

-- Insert sample product attributes
INSERT INTO product_attributes (product_id, attribute_name, attribute_value, sort_order) VALUES
-- iPhone 15 Pro attributes
(1, 'Screen Size', '6.1 inches', 1),
(1, 'Storage', '128GB', 2),
(1, 'RAM', '8GB', 3),
(1, 'Camera', '48MP Main + 12MP Ultra Wide + 12MP Telephoto', 4),
(1, 'Battery Life', 'Up to 23 hours video playback', 5),
(1, 'Operating System', 'iOS 17', 6),
(1, 'Colors Available', 'Natural Titanium, Blue Titanium, White Titanium, Black Titanium', 7),
(1, 'Connectivity', '5G, Wi-Fi 6E, Bluetooth 5.3', 8),
(1, 'Water Resistance', 'IP68', 9),

-- Samsung Galaxy S24 Ultra attributes
(2, 'Screen Size', '6.8 inches', 1),
(2, 'Storage', '256GB', 2),
(2, 'RAM', '12GB', 3),
(2, 'Camera', '200MP Main + 50MP Periscope Telephoto + 12MP Ultra Wide + 10MP Telephoto', 4),
(2, 'Battery', '5,000 mAh', 5),
(2, 'Operating System', 'Android 14 with One UI 6.1', 6),
(2, 'Colors Available', 'Titanium Gray, Titanium Black, Titanium Violet, Titanium Yellow', 7),
(2, 'S Pen', 'Included', 8),
(2, 'Water Resistance', 'IP68', 9),

-- MacBook Air M3 attributes
(3, 'Screen Size', '13.6 inches', 1),
(3, 'Storage', '256GB SSD', 2),
(3, 'RAM', '8GB Unified Memory', 3),
(3, 'Processor', 'Apple M3 chip with 8-core CPU', 4),
(3, 'Graphics', '8-core GPU', 5),
(3, 'Operating System', 'macOS Sonoma', 6),
(3, 'Colors Available', 'Silver, Space Gray, Starlight, Midnight', 7),
(3, 'Battery Life', 'Up to 18 hours', 8),
(3, 'Ports', '2 Thunderbolt / USB 4 ports, MagSafe 3', 9),

-- Wireless Charging Stand attributes
(4, 'Charging Power', '15W Fast Wireless Charging', 1),
(4, 'Compatibility', 'iPhone 8+, Samsung Galaxy S6+, AirPods Pro', 2),
(4, 'Angle Adjustment', '0-60 degrees', 3),
(4, 'Safety Features', 'Over-temperature protection, foreign object detection', 4),
(4, 'Input', 'USB-C', 5),
(4, 'Dimensions', '10cm x 8cm x 12cm', 6),
(4, 'Colors Available', 'Black, White', 7);