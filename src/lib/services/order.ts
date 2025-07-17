import type { D1Database } from '@cloudflare/workers-types';

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  shipping_method: 'pickup' | 'delivery';
  shipping_address?: string;
  pickup_location?: string;
  delivery_instructions?: string;
  payment_method: 'mobile_money' | 'card' | 'cash_on_delivery' | 'bank_transfer';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  payment_reference?: string;
  status: 'pending' | 'confirmed' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
  order_date: string;
  confirmed_at?: string;
  ready_at?: string;
  delivered_at?: string;
  admin_notes?: string;
  customer_notes?: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_attributes?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  customer_name_display?: string;
}

export interface CreateOrderData {
  customer_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_method: 'pickup' | 'delivery';
  shipping_address?: string;
  pickup_location?: string;
  delivery_instructions?: string;
  payment_method: 'mobile_money' | 'card' | 'cash_on_delivery' | 'bank_transfer';
  customer_notes?: string;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
  }[];
  discount_code?: string;
}

export class OrderService {
  constructor(private db: D1Database) {}

  async getAllOrders(params: {
    status?: string;
    payment_status?: string;
    shipping_method?: string;
    limit?: number;
    offset?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<{ orders: OrderWithItems[]; total: number }> {
    let query = `
      SELECT o.*, c.name as customer_name_display
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    
    if (params.status) {
      query += ` AND o.status = ?`;
      queryParams.push(params.status);
    }
    
    if (params.payment_status) {
      query += ` AND o.payment_status = ?`;
      queryParams.push(params.payment_status);
    }
    
    if (params.shipping_method) {
      query += ` AND o.shipping_method = ?`;
      queryParams.push(params.shipping_method);
    }
    
    if (params.search) {
      query += ` AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)`;
      const searchTerm = `%${params.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (params.date_from) {
      query += ` AND DATE(o.order_date) >= ?`;
      queryParams.push(params.date_from);
    }
    
    if (params.date_to) {
      query += ` AND DATE(o.order_date) <= ?`;
      queryParams.push(params.date_to);
    }
    
    query += ` ORDER BY o.created_at DESC`;
    
    if (params.limit) {
      query += ` LIMIT ?`;
      queryParams.push(params.limit);
      
      if (params.offset) {
        query += ` OFFSET ?`;
        queryParams.push(params.offset);
      }
    }

    const result = await this.db.prepare(query).bind(...queryParams).all();
    const orders = result.results as OrderWithItems[];

    // Get order items for each order
    for (const order of orders) {
      const itemsResult = await this.db.prepare(`
        SELECT oi.*, p.featured_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY oi.id
      `).bind(order.id).all();
      
      order.items = itemsResult.results as OrderItem[];
    }
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM orders o WHERE 1=1`;
    const countParams = queryParams.slice(0, -2); // Remove limit/offset
    
    if (params.status) countQuery += ` AND o.status = ?`;
    if (params.payment_status) countQuery += ` AND o.payment_status = ?`;
    if (params.shipping_method) countQuery += ` AND o.shipping_method = ?`;
    if (params.search) countQuery += ` AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)`;
    if (params.date_from) countQuery += ` AND DATE(o.order_date) >= ?`;
    if (params.date_to) countQuery += ` AND DATE(o.order_date) <= ?`;
    
    const countResult = await this.db.prepare(countQuery).bind(...countParams).first();
    
    return {
      orders,
      total: (countResult?.total as number) || 0
    };
  }

  async getOrderById(id: number): Promise<OrderWithItems | null> {
    const orderResult = await this.db.prepare(`
      SELECT o.*, c.name as customer_name_display
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).bind(id).first();
    
    if (!orderResult) return null;
    
    const order = orderResult as OrderWithItems;
    
    // Get order items
    const itemsResult = await this.db.prepare(`
      SELECT oi.*, p.featured_image, p.slug as product_slug
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `).bind(id).all();
    
    order.items = itemsResult.results as OrderItem[];
    
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
    const orderResult = await this.db.prepare(`
      SELECT o.*, c.name as customer_name_display
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.order_number = ?
    `).bind(orderNumber).first();
    
    if (!orderResult) return null;
    
    const order = orderResult as OrderWithItems;
    
    // Get order items
    const itemsResult = await this.db.prepare(`
      SELECT oi.*, p.featured_image, p.slug as product_slug
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `).bind(order.id).all();
    
    order.items = itemsResult.results as OrderItem[];
    
    return order;
  }

  async createOrder(data: CreateOrderData): Promise<Order> {
    // Calculate totals
    let subtotal = 0;
    const validatedItems = [];
    
    for (const item of data.items) {
      // Verify product exists and has sufficient stock
      const product = await this.db.prepare(`
        SELECT id, name, sku, price, stock_quantity, track_inventory
        FROM products 
        WHERE id = ? AND status = 'active'
      `).bind(item.product_id).first();
      
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found or inactive`);
      }
      
      if (product.track_inventory && product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }
      
      const itemTotal = item.quantity * item.unit_price;
      subtotal += itemTotal;
      
      validatedItems.push({
        ...item,
        product_name: product.name,
        product_sku: product.sku,
        total_price: itemTotal
      });
    }
    
    // Apply discount if provided
    let discountAmount = 0;
    if (data.discount_code) {
      const discount = await this.db.prepare(`
        SELECT * FROM discount_codes 
        WHERE code = ? AND is_active = 1 
        AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
        AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
      `).bind(data.discount_code).first();
      
      if (discount && subtotal >= (discount.minimum_order_amount || 0)) {
        if (discount.type === 'percentage') {
          discountAmount = Math.round(subtotal * discount.value / 100);
          if (discount.maximum_discount_amount) {
            discountAmount = Math.min(discountAmount, discount.maximum_discount_amount);
          }
        } else {
          discountAmount = discount.value;
        }
      }
    }
    
    const shippingAmount = 0; // Free shipping for now
    const taxAmount = 0; // No tax for now
    const totalAmount = subtotal + shippingAmount + taxAmount - discountAmount;
    
    // Create customer if email doesn't exist
    let customerId = data.customer_id;
    if (!customerId) {
      const existingCustomer = await this.db.prepare(`
        SELECT id FROM customers WHERE email = ?
      `).bind(data.customer_email).first();
      
      if (existingCustomer) {
        customerId = existingCustomer.id as number;
      } else {
        const customerResult = await this.db.prepare(`
          INSERT INTO customers (name, email, notes)
          VALUES (?, ?, ?)
        `).bind(data.customer_name, data.customer_email, `Phone: ${data.customer_phone}`).run();
        
        customerId = customerResult.meta.last_row_id as number;
      }
    }
    
    // Create order
    const orderResult = await this.db.prepare(`
      INSERT INTO orders (
        customer_id, customer_name, customer_email, customer_phone,
        subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
        shipping_method, shipping_address, pickup_location, delivery_instructions,
        payment_method, customer_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customerId,
      data.customer_name,
      data.customer_email,
      data.customer_phone,
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount,
      data.shipping_method,
      data.shipping_address,
      data.pickup_location,
      data.delivery_instructions,
      data.payment_method,
      data.customer_notes
    ).run();
    
    const orderId = orderResult.meta.last_row_id as number;
    
    // Create order items and update stock
    for (const item of validatedItems) {
      await this.db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, product_sku,
          quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        orderId,
        item.product_id,
        item.product_name,
        item.product_sku,
        item.quantity,
        item.unit_price,
        item.total_price
      ).run();
      
      // Update product stock
      await this.db.prepare(`
        UPDATE products 
        SET stock_quantity = stock_quantity - ?,
            status = CASE 
              WHEN stock_quantity - ? <= 0 THEN 'out_of_stock'
              ELSE status
            END
        WHERE id = ?
      `).bind(item.quantity, item.quantity, item.product_id).run();
    }
    
    return this.getOrderById(orderId) as Promise<Order>;
  }

  async updateOrderStatus(
    id: number, 
    status: Order['status'], 
    adminNotes?: string
  ): Promise<Order | null> {
    const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];
    
    // Set appropriate timestamp based on status
    switch (status) {
      case 'confirmed':
        updateFields.push('confirmed_at = CURRENT_TIMESTAMP');
        break;
      case 'ready_for_pickup':
        updateFields.push('ready_at = CURRENT_TIMESTAMP');
        break;
      case 'delivered':
        updateFields.push('delivered_at = CURRENT_TIMESTAMP');
        break;
    }
    
    if (adminNotes) {
      updateFields.push('admin_notes = ?');
      values.push(adminNotes);
    }
    
    values.push(id);
    
    const updateQuery = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.db.prepare(updateQuery).bind(...values).run();
    
    return this.getOrderById(id);
  }

  async updatePaymentStatus(
    id: number,
    paymentStatus: Order['payment_status'],
    paymentReference?: string
  ): Promise<Order | null> {
    const updateFields = ['payment_status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [paymentStatus];
    
    if (paymentReference) {
      updateFields.push('payment_reference = ?');
      values.push(paymentReference);
    }
    
    values.push(id);
    
    const updateQuery = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.db.prepare(updateQuery).bind(...values).run();
    
    return this.getOrderById(id);
  }

  async getOrderStats(): Promise<{
    total_orders: number;
    pending_orders: number;
    confirmed_orders: number;
    delivered_orders: number;
    total_revenue: number;
    today_orders: number;
    today_revenue: number;
  }> {
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        COUNT(CASE WHEN DATE(order_date) = DATE('now') THEN 1 END) as today_orders,
        SUM(CASE WHEN DATE(order_date) = DATE('now') AND payment_status = 'paid' THEN total_amount ELSE 0 END) as today_revenue
      FROM orders
    `).first();
    
    return stats as any;
  }
}