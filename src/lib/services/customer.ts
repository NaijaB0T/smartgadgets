export const CUSTOMER_QUERIES = {
  BASE_SELECT: `
    SELECT 
      customers.*,
      COUNT(orders.id) as order_count,
      SUM(orders.total_amount) as total_spent,
      MAX(orders.order_date) as last_order_date
    FROM customers 
    LEFT JOIN orders ON customers.id = orders.customer_id
    GROUP BY customers.id
  `,
  INSERT_CUSTOMER: `INSERT INTO customers (name, email, notes) VALUES (?, ?, ?)`,
  GET_BY_ID: `WHERE customers.id = ?`,
  GET_BY_EMAIL: `WHERE customers.email = ?`,
};

const processCustomerResults = (rows: any[]) => {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_count: row.order_count || 0,
    total_spent: row.total_spent || 0,
    last_order_date: row.last_order_date,
  }));
};

export class CustomerService {
  private DB: D1Database;

  constructor(DB: D1Database) {
    this.DB = DB;
  }

  async getById(id: number) {
    const query = `${CUSTOMER_QUERIES.BASE_SELECT} ${CUSTOMER_QUERIES.GET_BY_ID}`;
    const response = await this.DB.prepare(query).bind(id).all();

    if (response.success) {
      const [customer] = processCustomerResults(response.results);
      return customer;
    }
    return null;
  }

  async getByEmail(email: string) {
    const query = `${CUSTOMER_QUERIES.BASE_SELECT} ${CUSTOMER_QUERIES.GET_BY_EMAIL}`;
    const response = await this.DB.prepare(query).bind(email).all();

    if (response.success) {
      const [customer] = processCustomerResults(response.results);
      return customer;
    }
    return null;
  }

  async getAll() {
    const query = `${CUSTOMER_QUERIES.BASE_SELECT} ORDER BY customers.id ASC`;
    const response = await this.DB.prepare(query).all();

    if (response.success) {
      return processCustomerResults(response.results);
    }
    return [];
  }

  async create(customerData: {
    name: string;
    email: string;
    notes?: string;
    subscription?: {
      id: number;
      status: string;
    };
  }) {
    const { name, email, notes, subscription } = customerData;

    const customerResponse = await this.DB.prepare(
      CUSTOMER_QUERIES.INSERT_CUSTOMER,
    )
      .bind(name, email, notes || null)
      .run();

    if (!customerResponse.success) {
      throw new Error("Failed to create customer");
    }

    const customerId = customerResponse.meta.last_row_id;

    if (subscription) {
      const subscriptionResponse = await this.DB.prepare(
        CUSTOMER_QUERIES.INSERT_CUSTOMER_SUBSCRIPTION,
      )
        .bind(customerId, subscription.id, subscription.status)
        .run();

      if (!subscriptionResponse.success) {
        throw new Error("Failed to create customer subscription relationship");
      }
    }

    return { success: true, customerId };
  }
}
