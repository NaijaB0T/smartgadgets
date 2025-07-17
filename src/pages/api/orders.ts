import type { APIRoute } from 'astro';
import { OrderService } from '../../lib/services/order';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Check for admin authentication for full access
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || authHeader?.replace('Token ', '');
    const isAdmin = token === locals.runtime.env.API_TOKEN;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const payment_status = url.searchParams.get('payment_status') || undefined;
    const shipping_method = url.searchParams.get('shipping_method') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const date_from = url.searchParams.get('date_from') || undefined;
    const date_to = url.searchParams.get('date_to') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;
    const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1;
    const offset = (page - 1) * limit;

    // For non-admin requests, require order number or customer email
    const orderNumber = url.searchParams.get('order_number');
    const customerEmail = url.searchParams.get('customer_email');

    if (!isAdmin && !orderNumber && !customerEmail) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order number or customer email required for order lookup'
      }), { status: 400 });
    }

    const orderService = new OrderService(locals.runtime.env.DB);

    // For public tracking, get specific order
    if (!isAdmin) {
      if (orderNumber) {
        const order = await orderService.getOrderByNumber(orderNumber);
        if (!order || (customerEmail && order.customer_email !== customerEmail)) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Order not found'
          }), { status: 404 });
        }
        return new Response(JSON.stringify({
          success: true,
          data: [order],
          pagination: { page: 1, limit: 1, total: 1, total_pages: 1 }
        }), { status: 200 });
      }
    }

    // Admin access to all orders
    const result = await orderService.getAllOrders({
      status,
      payment_status,
      shipping_method,
      search,
      date_from,
      date_to,
      limit,
      offset
    });

    return new Response(JSON.stringify({
      success: true,
      data: result.orders,
      pagination: {
        page,
        limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit)
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch orders'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['customer_name', 'customer_email', 'customer_phone', 'shipping_method', 'payment_method', 'items'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }), { status: 400 });
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order must contain at least one item'
      }), { status: 400 });
    }

    const orderService = new OrderService(locals.runtime.env.DB);
    const order = await orderService.createOrder(data);

    return new Response(JSON.stringify({
      success: true,
      data: order
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};