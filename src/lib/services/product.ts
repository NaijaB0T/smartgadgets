import type { D1Database } from '@cloudflare/workers-types';

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  sku?: string;
  category_id?: number;
  brand?: string;
  model?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  featured_image?: string;
  gallery_images?: string;
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  is_featured: boolean;
  weight?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductAttribute {
  id: number;
  product_id: number;
  attribute_name: string;
  attribute_value: string;
  sort_order: number;
}

export interface ProductWithDetails extends Product {
  category_name?: string;
  attributes: ProductAttribute[];
  review_count?: number;
  average_rating?: number;
}

export interface CreateProductData {
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  sku?: string;
  category_id?: number;
  brand?: string;
  model?: string;
  stock_quantity: number;
  featured_image?: string;
  gallery_images?: string[];
  status?: string;
  is_featured?: boolean;
  weight?: number;
  attributes?: { name: string; value: string; sort_order?: number }[];
}

export class ProductService {
  constructor(private db: D1Database) {}

  async getAllProducts(params: {
    category?: string;
    categoryId?: number;
    status?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<{ products: ProductWithDetails[]; total: number }> {
    let query = `
      SELECT 
        p.*,
        c.name as category_name,
        COUNT(r.id) as review_count,
        ROUND(AVG(r.rating), 1) as average_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = 1
      WHERE 1=1
    `;
    
    const params_array: any[] = [];
    
    if (params.category) {
      query += ` AND c.slug = ?`;
      params_array.push(params.category);
    }
    
    if (params.categoryId) {
      query += ` AND p.category_id = ?`;
      params_array.push(params.categoryId);
    }
    
    if (params.status) {
      query += ` AND p.status = ?`;
      params_array.push(params.status);
    }
    
    if (params.featured !== undefined) {
      query += ` AND p.is_featured = ?`;
      params_array.push(params.featured ? 1 : 0);
    }
    
    if (params.search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)`;
      const searchTerm = `%${params.search}%`;
      params_array.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (params.minPrice !== undefined) {
      query += ` AND p.price >= ?`;
      params_array.push(params.minPrice);
    }
    
    if (params.maxPrice !== undefined) {
      query += ` AND p.price <= ?`;
      params_array.push(params.maxPrice);
    }
    
    query += ` GROUP BY p.id`;
    
    // Add sorting
    if (params.sortBy) {
      const sortOrder = params.sortOrder || 'DESC';
      switch (params.sortBy) {
        case 'price':
          query += ` ORDER BY p.price ${sortOrder}`;
          break;
        case 'is_featured':
          query += ` ORDER BY p.is_featured ${sortOrder}, p.created_at DESC`;
          break;
        case 'created_at':
        default:
          query += ` ORDER BY p.created_at ${sortOrder}`;
          break;
      }
    } else {
      query += ` ORDER BY p.created_at DESC`;
    }
    
    if (params.limit) {
      query += ` LIMIT ?`;
      params_array.push(params.limit);
      
      if (params.offset) {
        query += ` OFFSET ?`;
        params_array.push(params.offset);
      }
    }

    const result = await this.db.prepare(query).bind(...params_array).all();
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
    const countParams: any[] = [];
    
    if (params.category) {
      countQuery += ` AND c.slug = ?`;
      countParams.push(params.category);
    }
    if (params.categoryId) {
      countQuery += ` AND p.category_id = ?`;
      countParams.push(params.categoryId);
    }
    if (params.status) {
      countQuery += ` AND p.status = ?`;
      countParams.push(params.status);
    }
    if (params.featured !== undefined) {
      countQuery += ` AND p.is_featured = ?`;
      countParams.push(params.featured ? 1 : 0);
    }
    if (params.search) {
      countQuery += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)`;
      const searchTerm = `%${params.search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (params.minPrice !== undefined) {
      countQuery += ` AND p.price >= ?`;
      countParams.push(params.minPrice);
    }
    if (params.maxPrice !== undefined) {
      countQuery += ` AND p.price <= ?`;
      countParams.push(params.maxPrice);
    }
    
    const countResult = await this.db.prepare(countQuery).bind(...countParams).first();
    
    return {
      products: result.results as ProductWithDetails[],
      total: (countResult?.total as number) || 0
    };
  }

  async getProductById(id: number): Promise<ProductWithDetails | null> {
    const productQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        COUNT(r.id) as review_count,
        ROUND(AVG(r.rating), 1) as average_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = 1
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    const product = await this.db.prepare(productQuery).bind(id).first() as ProductWithDetails | null;
    
    if (!product) return null;

    // Get product attributes
    const attributesQuery = `
      SELECT * FROM product_attributes 
      WHERE product_id = ? 
      ORDER BY sort_order ASC, attribute_name ASC
    `;
    const attributesResult = await this.db.prepare(attributesQuery).bind(id).all();
    product.attributes = attributesResult.results as ProductAttribute[];

    return product;
  }

  async getProductBySlug(slug: string): Promise<ProductWithDetails | null> {
    const productQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        COUNT(r.id) as review_count,
        ROUND(AVG(r.rating), 1) as average_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = 1
      WHERE p.slug = ?
      GROUP BY p.id
    `;
    
    const product = await this.db.prepare(productQuery).bind(slug).first() as ProductWithDetails | null;
    
    if (!product) return null;

    // Get product attributes
    const attributesQuery = `
      SELECT * FROM product_attributes 
      WHERE product_id = ? 
      ORDER BY sort_order ASC, attribute_name ASC
    `;
    const attributesResult = await this.db.prepare(attributesQuery).bind(product.id).all();
    product.attributes = attributesResult.results as ProductAttribute[];

    return product;
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    const insertQuery = `
      INSERT INTO products (
        name, slug, description, short_description, price, compare_at_price,
        sku, category_id, brand, model, stock_quantity, featured_image,
        gallery_images, status, is_featured, weight
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const galleryImagesJson = data.gallery_images ? JSON.stringify(data.gallery_images) : null;
    
    const result = await this.db.prepare(insertQuery).bind(
      data.name,
      data.slug,
      data.description,
      data.short_description,
      data.price,
      data.compare_at_price,
      data.sku,
      data.category_id,
      data.brand,
      data.model,
      data.stock_quantity,
      data.featured_image,
      galleryImagesJson,
      data.status || 'active',
      data.is_featured ? 1 : 0,
      data.weight
    ).run();

    // Insert product attributes if provided
    if (data.attributes && data.attributes.length > 0) {
      for (const attr of data.attributes) {
        await this.db.prepare(`
          INSERT INTO product_attributes (product_id, attribute_name, attribute_value, sort_order)
          VALUES (?, ?, ?, ?)
        `).bind(result.meta.last_row_id, attr.name, attr.value, attr.sort_order || 0).run();
      }
    }

    return this.getProductById(result.meta.last_row_id as number) as Promise<Product>;
  }

  async updateProduct(id: number, data: Partial<CreateProductData>): Promise<Product | null> {
    const updateFields: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'attributes') return; // Handle separately
      if (key === 'gallery_images') {
        updateFields.push('gallery_images = ?');
        values.push(Array.isArray(value) ? JSON.stringify(value) : value);
      } else if (key === 'is_featured') {
        updateFields.push('is_featured = ?');
        values.push(value ? 1 : 0);
      } else {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return this.getProductById(id);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const updateQuery = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.db.prepare(updateQuery).bind(...values).run();

    // Update attributes if provided
    if (data.attributes) {
      // Delete existing attributes
      await this.db.prepare('DELETE FROM product_attributes WHERE product_id = ?').bind(id).run();
      
      // Insert new attributes
      for (const attr of data.attributes) {
        await this.db.prepare(`
          INSERT INTO product_attributes (product_id, attribute_name, attribute_value, sort_order)
          VALUES (?, ?, ?, ?)
        `).bind(id, attr.name, attr.value, attr.sort_order || 0).run();
      }
    }

    return this.getProductById(id);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    return result.success;
  }

  async updateStock(id: number, quantity: number): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE products 
      SET stock_quantity = ?, 
          status = CASE 
            WHEN ? <= 0 THEN 'out_of_stock' 
            WHEN status = 'out_of_stock' AND ? > 0 THEN 'active'
            ELSE status 
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(quantity, quantity, quantity, id).run();
    
    return result.success;
  }

  async getLowStockProducts(): Promise<Product[]> {
    const query = `
      SELECT * FROM products 
      WHERE stock_quantity <= low_stock_threshold 
      AND status = 'active'
      ORDER BY stock_quantity ASC
    `;
    
    const result = await this.db.prepare(query).all();
    return result.results as Product[];
  }
}