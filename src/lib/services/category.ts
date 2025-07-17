import type { D1Database } from '@cloudflare/workers-types';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithProducts extends Category {
  product_count: number;
  parent_name?: string;
  children?: Category[];
}

export class CategoryService {
  constructor(private db: D1Database) {}

  async getAllCategories(includeInactive = false): Promise<{ data: CategoryWithProducts[] }> {
    let query = `
      SELECT 
        c.*,
        COUNT(p.id) as product_count,
        pc.name as parent_name
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      LEFT JOIN categories pc ON c.parent_id = pc.id
    `;
    
    if (!includeInactive) {
      query += ` WHERE c.is_active = 1`;
    }
    
    query += ` GROUP BY c.id ORDER BY c.sort_order ASC, c.name ASC`;
    
    const result = await this.db.prepare(query).all();
    return {
      data: result.results as CategoryWithProducts[]
    };
  }

  async getCategoryBySlug(slug: string): Promise<CategoryWithProducts | null> {
    const result = await this.db.prepare(`
      SELECT 
        c.*,
        COUNT(p.id) as product_count,
        pc.name as parent_name
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE c.slug = ? AND c.is_active = 1
      GROUP BY c.id
    `).bind(slug).first();
    
    return result as CategoryWithProducts | null;
  }

  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    image_url?: string;
    parent_id?: number;
    sort_order?: number;
  }): Promise<Category> {
    const result = await this.db.prepare(`
      INSERT INTO categories (name, slug, description, image_url, parent_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.slug,
      data.description,
      data.image_url,
      data.parent_id,
      data.sort_order || 0
    ).run();

    return this.getCategoryById(result.meta.last_row_id as number) as Promise<Category>;
  }

  async getCategoryById(id: number): Promise<Category | null> {
    const result = await this.db.prepare(`
      SELECT * FROM categories WHERE id = ?
    `).bind(id).first();
    
    return result as Category | null;
  }

  async updateCategory(id: number, data: Partial<{
    name: string;
    slug: string;
    description: string;
    image_url: string;
    parent_id: number;
    sort_order: number;
    is_active: boolean;
  }>): Promise<Category | null> {
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      updateFields.push(`${key} = ?`);
      values.push(value);
    });

    if (updateFields.length === 0) {
      return this.getCategoryById(id);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const updateQuery = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.db.prepare(updateQuery).bind(...values).run();

    return this.getCategoryById(id);
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Check if category has products
    const productCount = await this.db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE category_id = ?
    `).bind(id).first();
    
    if ((productCount?.count as number) > 0) {
      throw new Error('Cannot delete category with existing products');
    }

    const result = await this.db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    return result.success;
  }
}